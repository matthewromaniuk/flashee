import { supabase } from './supabaseClient.js'

const READ_ROLES = new Set(['viewer', 'editor', 'owner'])
const WRITE_ROLES = new Set(['editor', 'owner'])
const OWNER_ROLES = new Set(['owner'])

export function getRequesterEmail(req) {
  const headerEmail = req.headers['x-user-email']
  const queryEmail = req.query?.email
  const bodyEmail = req.body?.user_email

  if (typeof headerEmail === 'string' && headerEmail.trim()) return headerEmail.trim()
  if (typeof queryEmail === 'string' && queryEmail.trim()) return queryEmail.trim()
  if (typeof bodyEmail === 'string' && bodyEmail.trim()) return bodyEmail.trim()

  return null
}

export async function getDeckRole(deckId, userEmail) {
  const { data, error } = await supabase
    .from('deck_user')
    .select('deck_id, role')
    .eq('user_email', userEmail)

  if (error) {
    return { role: null, error }
  }

  const targetId = String(deckId)
  const match = (data ?? []).find((row) => {
    try {
      return BigInt(row.deck_id) === BigInt(targetId)
    } catch {
      return String(row.deck_id) === targetId
    }
  })

  return { role: match?.role ?? null, error: null }
}

export function canRead(role) {
  return READ_ROLES.has(role)
}

export function canWrite(role) {
  return WRITE_ROLES.has(role)
}

export function isOwner(role) {
  return OWNER_ROLES.has(role)
}
