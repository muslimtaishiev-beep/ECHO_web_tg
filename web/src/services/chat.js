import {
  collection, doc, addDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { generateRoomKey } from '../lib/crypto.js'

/**
 * Teenager requests help — creates a "waiting" room owned by their uid.
 * The per-room AES key is stored on the room so both participants can
 * read it (enforced by the Firestore rules).
 */
export async function requestChat({ nickname, mood, topic, userId }) {
  const encryptionKey = generateRoomKey()
  const ref = await addDoc(collection(db, 'chatRooms'), {
    anonNickname: nickname,
    mood,
    topic: topic || 'general',
    status: 'waiting',
    source: 'web',
    userId,
    encryptionKey,
    createdAt: serverTimestamp(),
  })
  return { roomId: ref.id, encryptionKey }
}

/** Live room document (status, volunteer, encryptionKey). */
export function watchRoom(roomId, cb) {
  return onSnapshot(doc(db, 'chatRooms', roomId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

/** Live ordered messages for a room. */
export function watchMessages(roomId, cb) {
  const q = query(
    collection(db, 'chatRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

/** Append an (already encrypted) message to a room. */
export function sendMessage(roomId, { content, iv, senderType }) {
  return addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
    content,
    iv,
    senderType,
    createdAt: serverTimestamp(),
  })
}

/** Volunteer claims a waiting room. */
export function acceptRoom(roomId, { volunteerId, volunteerName }) {
  return updateDoc(doc(db, 'chatRooms', roomId), {
    volunteerId,
    volunteerName,
    status: 'active',
  })
}

/** Close a room. */
export function closeRoom(roomId) {
  return updateDoc(doc(db, 'chatRooms', roomId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  })
}

/** Live waiting queue for the volunteer dashboard. */
export function watchQueue(cb) {
  const q = query(
    collection(db, 'chatRooms'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

/** Fetch a single room (used to restore a session). */
export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, 'chatRooms', roomId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Find the latest non-closed room for a user (session restore). */
export async function getActiveRoom(userId) {
  const q = query(
    collection(db, 'chatRooms'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(5),
  )
  const snap = await getDocs(q)
  const active = snap.docs.find((d) => ['waiting', 'active'].includes(d.data().status))
  return active ? { id: active.id, ...active.data() } : null
}
