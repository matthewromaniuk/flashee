import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { canWrite, canRead, getRequesterEmail, getDeckRole, isOwner } from '../lib/deckPermissions.js'
import { authorizeDeckAccess } from '../lib/deckAccess.js'
import { forkDeckById } from '../lib/deckFork.js'

export async function getDeckById(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: 'Path parameter "id" is required' })
  }

  const authz = await authorizeDeckAccess(req, res, id, 'read')
  if (!authz.allowed) return

  const { data, error } = await supabase
    .from('deck')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  return res.status(200).json({ deck: { ...data, role: authz.role ?? null } })
}

export async function getDecksByUserEmail(req, res) {
const { userId } = req.params
const requesterUserId = req.headers['x-user-id']
const requesterEmail = getRequesterEmail(req)

if (!userId || typeof userId !== 'string') {
return res.status(400).json({ error: 'Path parameter "userId" is required' })
}

if (!requesterEmail) {
return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
}

if (typeof requesterUserId === 'string' && requesterUserId && requesterUserId !== userId) {
return res.status(403).json({ error: 'User id mismatch' })
}

const { data, error } = await supabase
.from('deck_user')
.select('role, deck:deck_id(*)')
.eq('user_email', requesterEmail)

if (error) {
return res.status(500).json({ error: error.message })
}

const decks = (data ?? [])
.filter((entry) => entry.deck)
.map((entry) => ({ ...entry.deck, role: entry.role }))

return res.status(200).json({ decks })
}

export async function getPublicDecks(req, res) {
const { data, error } = await supabase
.from('deck')
.select('*')
.eq('isPublic', true)

if (error) {
return res.status(500).json({ error: error.message })
}

return res.status(200).json({ decks: data ?? [] })
}

export async function createDeck(req, res) {
const payload = req.body ?? {}
const { tags, source_file_name, user_email, course_id, ...deckFields } = payload
const requesterEmail = getRequesterEmail(req)
const deckId = generateInt64Id()
const normalizedCourseId = course_id == null || course_id === '' ? null : String(course_id)

if (!requesterEmail) {
return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
}

if (!payload.name || typeof payload.name !== 'string') {
return res.status(400).json({ error: 'Field "name" is required' })
}

const { data, error } = await supabase
.from('deck')
.insert({ ...deckFields, id: deckId, course_id: normalizedCourseId })
.select('*')

if (error) {
return res.status(400).json({ error: error.message })
}

const createdDeck = data?.[0]
if (!createdDeck) {
return res.status(500).json({ error: 'Deck created but id missing in response' })
}

const { error: relationError } = await supabase
.from('deck_user')
.insert({
user_email: requesterEmail,
deck_id: deckId,
role: 'owner',
})

if (relationError) {
await supabase.from('deck').delete().eq('id', deckId)
return res.status(400).json({ error: relationError.message })
}

return res.status(201).json({ deck: { ...createdDeck, id: deckId } })
}

export async function deleteDeck(req, res) {
const { id } = req.params
const requesterEmail = getRequesterEmail(req)

if (!id) {
return res.status(400).json({ error: 'Path parameter "id" is required' })
}

if (!requesterEmail) {
return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
}

const { role, error: roleError } = await getDeckRole(id, requesterEmail)

if (roleError) {
return res.status(500).json({ error: roleError.message })
}

if (!isOwner(role)) {
return res.status(403).json({ error: 'Only owners can delete decks' })
}

const { data, error } = await supabase
.from('deck')
.delete()
.eq('id', id)
.select('*')

if (error) {
return res.status(400).json({ error: error.message })
}

if (!data || data.length === 0) {
return res.status(404).json({ error: 'Deck not found' })
}

return res.status(200).json({ message: 'Deck deleted', deck: data[0] })
}

export async function updateDeck(req, res) {
const { id } = req.params
const requesterEmail = getRequesterEmail(req)
const payload = req.body ?? {}

if (!id) {
return res.status(400).json({ error: 'Path parameter "id" is required' })
}

if (!requesterEmail) {
return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
}

const { role, error: roleError } = await getDeckRole(id, requesterEmail)
if (roleError) {
return res.status(500).json({ error: roleError.message })
}

if (!canWrite(role)) {
return res.status(403).json({ error: 'Insufficient role for this deck' })
}

const updatePayload = {}
if (typeof payload.name === 'string') {
updatePayload.name = payload.name
}
if (typeof payload.isPublic === 'boolean') {
updatePayload.isPublic = payload.isPublic
}
if (Object.prototype.hasOwnProperty.call(payload, 'course_id')) {
updatePayload.course_id = payload.course_id == null || payload.course_id === ''
? null
: String(payload.course_id)
}

if (Object.keys(updatePayload).length === 0) {
return res.status(400).json({ error: 'Provide at least one editable field (name, isPublic, course_id)' })
}

const { data, error } = await supabase
.from('deck')
.update(updatePayload)
.eq('id', id)
.select('*')

if (error) {
return res.status(400).json({ error: error.message })
}

if (!data || data.length === 0) {
return res.status(404).json({ error: 'Deck not found' })
}

return res.status(200).json({ deck: data[0] })
}

export async function forkDeck(req, res) {
const { id } = req.params
const requesterEmail = getRequesterEmail(req)

if (!id) {
return res.status(400).json({ error: 'Path parameter "id" is required' })
}

if (!requesterEmail) {
return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
}

  const result = await forkDeckById({ id, requesterEmail })
  if (result.error) {
    return res.status(result.status ?? 400).json({ error: result.error })
  }

return res.status(201).json({ deck: result.deck })
}
