import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Maintains the public `platform/stats` document read by the landing page.
// (admin.initializeApp() is called once in admin.ts, imported first.)
export const updateStats = functions.scheduler.onSchedule('every 1 hours', async () => {
  const firestore = admin.firestore();
  const [roomsSnap, volSnap] = await Promise.all([
    firestore.collection('chatRooms').get(),
    firestore.collection('volunteers').get(),
  ]);
  await firestore.collection('platform').doc('stats').set({
    rooms: roomsSnap.size,
    volunteers: volSnap.size,
    updatedAt: new Date(),
  });
});
