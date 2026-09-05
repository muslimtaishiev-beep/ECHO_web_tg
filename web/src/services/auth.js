import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase.js'

// Callable Cloud Functions (see functions/src/admin.ts).
const approveUserFn = httpsCallable(functions, 'approveUser')
const verifyVolunteerFn = httpsCallable(functions, 'verifyVolunteer')
const deleteVolunteerFn = httpsCallable(functions, 'deleteVolunteer')
const promoteVolunteerFn = httpsCallable(functions, 'promoteVolunteer')
const promoteAdminFn = httpsCallable(functions, 'promoteAdmin')
const setup2FAFn = httpsCallable(functions, 'setup2FA')
const verify2FAFn = httpsCallable(functions, 'verify2FA')
const disable2FAFn = httpsCallable(functions, 'disable2FA')
const verifyAdmin2FAFn = httpsCallable(functions, 'verifyAdmin2FA')
const exportJsonFn = httpsCallable(functions, 'exportDataJson')

export function approveUser(userId) {
  return approveUserFn({ userId })
}

export function verifyVolunteer(volunteerId, isVerified) {
  return verifyVolunteerFn({ volunteerId, isVerified })
}

export function deleteVolunteer(volunteerId) {
  return deleteVolunteerFn({ volunteerId })
}

export function promoteVolunteer(volunteerId) {
  return promoteVolunteerFn({ volunteerId })
}

export function promoteAdmin(uid) {
  return promoteAdminFn({ uid })
}

export function setup2FA() {
  return setup2FAFn()
}

export function verify2FA(token) {
  return verify2FAFn({ token })
}

export function disable2FA() {
  return disable2FAFn()
}

export function verifyAdmin2FA(token) {
  return verifyAdmin2FAFn({ token })
}

/** Download the admin JSON export (callable — no hardcoded URL). */
export async function downloadExport() {
  const res = await exportJsonFn()
  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'ECHO_export.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
