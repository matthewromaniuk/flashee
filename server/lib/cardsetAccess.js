import { supabase } from './supabaseClient.js'
import { canRead, canWrite, getCardsetRole, getRequesterEmail } from './cardsetPermissions.js'

export async function getCardsetAccessContext(cardsetId) {
  const { data, error } = await supabase
    .from('cardset')
    .select('id,isPublic')
    .eq('id', cardsetId)
    .maybeSingle()

  return { cardset: data, error }
}

export async function authorizeCardsetAccess(req, res, cardsetId, mode) {
  const { cardset, error: cardsetError } = await getCardsetAccessContext(cardsetId)

  if (cardsetError) {
    return res.status(500).json({ error: cardsetError.message })
  }

  if (!cardset) {
    return res.status(404).json({ error: 'Cardset not found' })
  }

  const requesterEmail = getRequesterEmail(req)

  if (mode === 'read' && cardset.isPublic) {
    return { allowed: true, role: null, requesterEmail }
  }

  if (!requesterEmail) {
    res.status(mode === 'read' ? 403 : 400).json({
      error: mode === 'read'
        ? 'Insufficient permissions for this cardset'
        : 'Requester email is required (x-user-email header, query email, or body user_email)',
    })
    return { allowed: false }
  }

  const { role, error } = await getCardsetRole(cardsetId, requesterEmail)

  if (error) {
    res.status(500).json({ error: error.message })
    return { allowed: false }
  }

  const allowed = mode === 'read' ? canRead(role) : canWrite(role)
  if (!allowed) {
    res.status(403).json({ error: 'Insufficient role for this cardset' })
    return { allowed: false }
  }

  return { allowed: true, role, requesterEmail }
}
