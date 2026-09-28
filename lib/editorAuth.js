import crypto from 'crypto'

export const EDITOR_COOKIE = 'tmc_editor'

// The cookie holds an HMAC derived from the passcode, so changing
// EDIT_PASSCODE in Vercel signs every device out.
export function editorToken() {
  const passcode = process.env.EDIT_PASSCODE
  if (!passcode) return null
  return crypto.createHmac('sha256', passcode).update('tmc-editor-v1').digest('hex')
}

export function passcodeMatches(input) {
  const passcode = process.env.EDIT_PASSCODE
  if (!passcode || typeof input !== 'string') return false
  const a = crypto.createHash('sha256').update(input.trim()).digest()
  const b = crypto.createHash('sha256').update(passcode).digest()
  return crypto.timingSafeEqual(a, b)
}

export function isEditor(request) {
  const token = editorToken()
  const value = request.cookies.get(EDITOR_COOKIE)?.value
  if (!token || !value || value.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(token))
}
