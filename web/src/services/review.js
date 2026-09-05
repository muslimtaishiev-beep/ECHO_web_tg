import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

/**
 * Submit a 1-5 rating for a volunteer after a chat closes.
 * The review document id is the chatRoomId, so there is at most one
 * review per conversation.
 */
export function submitReview({ chatRoomId, volunteerId, userId, score }) {
  return setDoc(doc(db, 'reviews', chatRoomId), {
    chatRoomId,
    volunteerId,
    userId,
    score,
    createdAt: serverTimestamp(),
  })
}
