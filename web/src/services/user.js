import {
  doc, setDoc, getDoc, onSnapshot, collection, query, where, orderBy, getDocs,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../lib/firebase.js'

/**
 * Firebase Auth needs an email for email/password accounts, but ECHO's
 * permanent-account flow only asks for a nickname + password (no email).
 * We derive a stable synthetic email from the nickname, so the UX stays
 * identical while Firebase Auth enforces nickname uniqueness for us.
 */
export function syntheticEmail(nickname) {
  const clean = nickname.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${clean}@echo.user`
}

/** Register a permanent teen account (nickname + password → pending approval). */
export async function registerPermanentUser(nickname, password) {
  const email = syntheticEmail(nickname)
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    nickname,
    email,
    isApproved: false,
    specialId: null,
    createdAt: new Date(),
  })
  return cred.user
}

/** Sign in a permanent account by nickname + password (used by the status page). */
export function loginByNickname(nickname, password) {
  return signInWithEmailAndPassword(auth, syntheticEmail(nickname), password)
}

/** Sign in by the admin-assigned ECHO ID + password. */
export async function loginBySpecialId(specialId, password) {
  const q = query(collection(db, 'users'), where('specialId', '==', specialId))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Неверный ID или аккаунт ещё не одобрен')
  const data = snap.docs[0].data()
  const email = data.email || syntheticEmail(data.nickname)
  return signInWithEmailAndPassword(auth, email, password)
}

/** Read a single user profile by uid. */
export async function getUserByUid(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Live profile document for a registered teen. */
export function watchUser(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null)
  })
}

/** Live chat history for a registered teen (newest first). */
export function watchHistory(uid, cb) {
  const q = query(
    collection(db, 'chatRooms'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (s) => {
    cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}
