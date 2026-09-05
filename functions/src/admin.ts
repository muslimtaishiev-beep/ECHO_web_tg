import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Firebase Functions v6 uses a single `CallableRequest` argument.
type CallableRequest = functions.https.CallableRequest<Record<string, unknown>>;

/** Guard: only a caller with the 'admin' custom claim may proceed. */
async function requireAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Not signed in.');
  }
  const token = request.auth.token as Record<string, unknown>;
  if (token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  }
  return request.auth.uid;
}

function makeSpecialId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ECHO-${n}`;
}

/** Approve a registered teen and assign their ECHO special ID. */
export const approveUser = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const userId = request.data?.userId as string;
  if (!userId) throw new functions.https.HttpsError('invalid-argument', 'userId required.');

  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

  await ref.update({
    isApproved: true,
    specialId: snap.get('specialId') || makeSpecialId(),
  });

  await db.collection('auditLogs').add({
    adminId,
    action: 'APPROVE_USER',
    targetId: userId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Verify a volunteer and (optionally) grant the 'volunteer' custom claim. */
export const verifyVolunteer = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const volunteerId = request.data?.volunteerId as string;
  const isVerified = Boolean(request.data?.isVerified);
  if (!volunteerId) throw new functions.https.HttpsError('invalid-argument', 'volunteerId required.');

  await db.collection('volunteers').doc(volunteerId).update({ isVerified });

  if (isVerified) {
    await auth.setCustomUserClaims(volunteerId, { role: 'volunteer' });
  } else {
    await auth.setCustomUserClaims(volunteerId, null);
  }

  await db.collection('auditLogs').add({
    adminId,
    action: 'VERIFY_VOLUNTEER',
    targetId: volunteerId,
    details: isVerified ? 'verified' : 'unverified',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Delete a volunteer and record the action. */
export const deleteVolunteer = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const volunteerId = request.data?.volunteerId as string;
  if (!volunteerId) throw new functions.https.HttpsError('invalid-argument', 'volunteerId required.');
  await db.collection('volunteers').doc(volunteerId).delete();
  await db.collection('auditLogs').add({
    adminId,
    action: 'DELETE_VOLUNTEER',
    targetId: volunteerId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Promote an existing account to admin. */
export const promoteAdmin = functions.https.onCall(async (request) => {
  await requireAdmin(request);
  const uid = request.data?.uid as string;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid required.');
  await auth.setCustomUserClaims(uid, { role: 'admin' });
  await db.collection('admins').doc(uid).set({ uid, createdAt: new Date() });
  return { ok: true };
});

// ── Admin 2FA (TOTP via speakeasy + QR) ──────────────────────────

/** Generate a TOTP secret + QR code and store it (not yet enabled). */
export const setup2FA = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const secret = speakeasy.generateSecret({ name: 'ECHO Admin' });
  const otpauthUrl = secret.otpauth_url;
  if (!otpauthUrl) throw new functions.https.HttpsError('internal', 'Failed to generate secret.');
  const qrCode = await qrcode.toDataURL(otpauthUrl);

  await db.collection('admins').doc(adminId).set(
    { uid: adminId, twoFactorSecret: secret.base32, isTwoFactorEnabled: false },
    { merge: true },
  );
  return { secret: secret.base32, otpauthUrl, qrCode };
});

/** Enable 2FA after the admin proves they can generate a valid code. */
export const verify2FA = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const token = request.data?.token as string;
  if (!token) throw new functions.https.HttpsError('invalid-argument', 'token required.');

  const snap = await db.collection('admins').doc(adminId).get();
  const secret = snap.get('twoFactorSecret');
  if (!secret) throw new functions.https.HttpsError('failed-precondition', 'Run setup2FA first.');

  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  if (!valid) throw new functions.https.HttpsError('invalid-argument', 'Invalid code.');

  await db.collection('admins').doc(adminId).update({ isTwoFactorEnabled: true });
  return { ok: true };
});

/** Remove 2FA from an admin account. */
export const disable2FA = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  await db.collection('admins').doc(adminId).update({
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
  });
  return { ok: true };
});

/**
 * Verify a TOTP code at login time. The web admin panel calls this after
 * email/password sign-in when the admin has 2FA enabled.
 */
export const verifyAdmin2FA = functions.https.onCall(async (request) => {
  const adminId = await requireAdmin(request);
  const token = request.data?.token as string;

  const snap = await db.collection('admins').doc(adminId).get();
  if (!snap.get('isTwoFactorEnabled')) return { ok: true };

  const secret = snap.get('twoFactorSecret');
  if (!secret) throw new functions.https.HttpsError('failed-precondition', '2FA not configured.');

  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  if (!valid) throw new functions.https.HttpsError('invalid-argument', 'Invalid code.');
  return { ok: true };
});

/**
 * One-time bootstrap for the very first admin (there is no admin yet to
 * call promoteAdmin). Invoke with:
 *   GET /seedAdmin?secret=YOUR_ADMIN_SEED_SECRET&uid=<auth-uid>
 * Set ADMIN_SEED_SECRET in the functions environment.
 */
export const seedAdmin = functions.https.onRequest(async (req, res) => {
  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret || req.query.secret !== secret) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const uid = req.query.uid as string;
  if (!uid) {
    res.status(400).json({ error: 'uid required' });
    return;
  }
  await auth.setCustomUserClaims(uid, { role: 'admin' });
  await db.collection('admins').doc(uid).set({ uid, createdAt: new Date() });
  res.status(200).json({ ok: true });
});

/** JSON export of core collections as a callable (no hardcoded URL). */
export const exportDataJson = functions.https.onCall(async (request) => {
  await requireAdmin(request);
  const out: Record<string, unknown[]> = {};
  for (const col of ['users', 'volunteers', 'chatRooms', 'reviews', 'auditLogs']) {
    const snap = await db.collection(col).get();
    out[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return out;
});

/** JSON export of core collections (admin only, Bearer token). */
export const exportData = functions.https.onRequest(async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const out: Record<string, unknown[]> = {};
  for (const col of ['users', 'volunteers', 'chatRooms', 'reviews', 'auditLogs']) {
    const snap = await db.collection(col).get();
    out[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  res.type('application/json');
  res.attachment('ECHO_export.json');
  res.send(JSON.stringify(out, null, 2));
});
