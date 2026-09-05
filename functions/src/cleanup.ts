import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const AUTO_DELETE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Recursively delete a collection (used for message subcollections). */
async function deleteCollection(
  ref: admin.firestore.CollectionReference,
  batchSize = 200,
): Promise<void> {
  const snap = await ref.limit(batchSize).get();
  if (snap.size === 0) return;
  const batch = admin.firestore().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  if (snap.size === batchSize) {
    await deleteCollection(ref, batchSize);
  }
}

/**
 * Scheduled job: delete closed chats (and their messages) older than 24h.
 * This implements ECHO's "auto-deletion" privacy guarantee.
 */
export const deleteOldChats = functions.scheduler.onSchedule('every 1 hours', async () => {
  const firestore = admin.firestore();
  const cutoff = new Date(Date.now() - AUTO_DELETE_MS);

  const snap = await firestore.collection('chatRooms')
    .where('status', '==', 'closed')
    .where('closedAt', '<=', cutoff)
    .limit(100)
    .get();

  for (const doc of snap.docs) {
    await deleteCollection(doc.ref.collection('messages'));
    await doc.ref.delete();
  }

  return null;
});
