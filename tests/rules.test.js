import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8')

// Under `firebase emulators:exec` the host is exported as FIRESTORE_EMULATOR_HOST.
const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')

let env

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'echo-test',
    firestore: { host, port: Number(portStr), rules },
  })
})

after(async () => {
  if (env) await env.cleanup()
})

const teen = (uid) => env.authenticatedContext(uid).firestore()
const volunteer = (uid) => env.authenticatedContext(uid, { role: 'volunteer' }).firestore()
const admin = (uid) => env.authenticatedContext(uid, { role: 'admin' }).firestore()

test('a user can create and read their own profile', async () => {
  const db = teen('teen1')
  await assertSucceeds(db.doc('users/teen1').set({ nickname: 'Teen', isApproved: false }))
  const snap = await db.doc('users/teen1').get()
  assert.equal(snap.data().nickname, 'Teen')
})

test('a user cannot read another user profile', async () => {
  await assertFails(teen('teen2').doc('users/teen1').get())
})

test('a teen can create a room they own', async () => {
  await assertSucceeds(teen('teen1').collection('chatRooms').doc('room1').set({
    anonNickname: 'x', status: 'waiting', userId: 'teen1', source: 'web',
  }))
})

test('a teen cannot create a room owned by someone else', async () => {
  await assertFails(teen('teen2').collection('chatRooms').doc('roomX').set({
    anonNickname: 'x', status: 'waiting', userId: 'teen1', source: 'web',
  }))
})

test('a non-participant cannot read a room', async () => {
  await assertFails(teen('teen2').doc('chatRooms/room1').get())
})

test('a non-participant cannot read messages', async () => {
  await assertFails(teen('teen2').collection('chatRooms/room1/messages').doc('m1').get())
})

test('a volunteer can read a waiting room (queue)', async () => {
  await assertSucceeds(volunteer('vol1').doc('chatRooms/room1').get())
})

test('a volunteer can claim a waiting room', async () => {
  await assertSucceeds(volunteer('vol1').doc('chatRooms/room1').update({
    volunteerId: 'vol1', status: 'active',
  }))
})

test('a teen cannot review a room they do not own', async () => {
  await assertFails(teen('teen2').collection('reviews').doc('room1').set({
    chatRoomId: 'room1', volunteerId: 'vol1', userId: 'teen2', score: 5,
  }))
})

test('the room owner can leave a review', async () => {
  await assertSucceeds(teen('teen1').collection('reviews').doc('room1').set({
    chatRoomId: 'room1', volunteerId: 'vol1', userId: 'teen1', score: 5,
  }))
})

test('an admin can read any room', async () => {
  await assertSucceeds(admin('admin1').doc('chatRooms/room1').get())
})
