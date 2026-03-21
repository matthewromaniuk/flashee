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

export async function getCardsetRole(cardsetId, userEmail) {
  const { data, error } = await supabase
    .from('card_user')
    .select('cardset_id, role')
    .eq('user_email', userEmail)

  if (error) {
    return { role: null, error }
  }

  const targetId = String(cardsetId)
  const match = (data ?? []).find((row) => {
    try {
      return BigInt(row.cardset_id) === BigInt(targetId)
    } catch {
      return String(row.cardset_id) === targetId
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
