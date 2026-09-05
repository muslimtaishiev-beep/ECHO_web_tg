// Seeds (or promotes) the first admin with the 'admin' custom claim.
// Usage:  node seed-admin.js [email] [password]
// Run from the functions/ directory (has firebase-admin installed).
const admin = require('firebase-admin');
const { randomBytes } = require('crypto');

const key = require('../serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(key) });

const email = process.argv[2] || 'admin@echo.app';
const password = process.argv[3] || `Echo-${randomBytes(9).toString('hex')}`;

async function main() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log('ℹ️  User already exists, promoting to admin.');
  } catch {
    user = await admin.auth().createUser({ email, password, emailVerified: true });
  }
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  await admin.firestore().collection('admins').doc(user.uid).set({
    uid: user.uid,
    email,
    displayName: 'System Administrator',
    createdAt: new Date(),
  });
  console.log('ADMIN_EMAIL=' + email);
  console.log('ADMIN_PASSWORD=' + password);
  console.log('ADMIN_UID=' + user.uid);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
