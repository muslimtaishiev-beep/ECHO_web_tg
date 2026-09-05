import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

// Config is injected at build time via Vite env vars (see web/.env.example).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.warn('Firebase config is missing. Copy web/.env.example to web/.env.local and fill in your project values.')
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

/** Sign the user in anonymously (teenagers have no personal data). */
export async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

/** Email/password sign-in (volunteers + admins). */
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

/** Email/password registration. */
export function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

/** Resolve the caller's role from custom claims. */
export async function getRole(user) {
  if (!user) return null
  const token = await user.getIdTokenResult()
  return token.claims.role || null
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb)
}

export function logout() {
  return signOut(auth)
}
