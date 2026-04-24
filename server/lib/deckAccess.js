//Deck access control logic
import { supabase } from './supabaseClient.js'
import { canRead, canWrite, getDeckRole, getRequesterEmail } from './deckPermissions.js'

//Deck access control logic
export async function getDeckAccessContext(deckId) {
  const { data, error } = await supabase
    .from('deck')
    .select('id,isPublic')
    .eq('id', deckId)
    .maybeSingle()

  return { deck: data, error }
}

export async function authorizeDeckAccess(req, res, deckId, mode) {
  const { deck, error: deckError } = await getDeckAccessContext(deckId)

  if (deckError) {
    return res.status(500).json({ error: deckError.message })
  }

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const requesterEmail = getRequesterEmail(req)
  if (requesterEmail) {
    const { role, error } = await getDeckRole(deckId, requesterEmail)

    if (error) {
      res.status(500).json({ error: error.message })
      return { allowed: false }
    }

    if (mode === 'read') {
      if (canRead(role) || deck.isPublic) {
        return { allowed: true, role, requesterEmail }
      }
    } else if (canWrite(role)) {
      return { allowed: true, role, requesterEmail }
    }
  }

  if (mode === 'read' && deck.isPublic) {
    return { allowed: true, role: null, requesterEmail }
  }

  res.status(mode === 'read' ? 403 : 400).json({
    error: mode === 'read'
      ? 'Insufficient permissions for this deck'
      : 'Requester email is required (x-user-email header, query email, or body user_email)',
  })
  return { allowed: false }
}
