import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { canWrite, getRequesterEmail, getCardsetRole, isOwner } from '../lib/cardsetPermissions.js'
import { forkCardsetById } from '../lib/cardsetFork.js'

export async function getCardsetsByUserEmail(req, res) {
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
		.from('card_user')
		.select('role, cardset:cardset_id(*)')
		.eq('user_email', requesterEmail)

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	const cardsets = (data ?? [])
		.filter((entry) => entry.cardset)
		.map((entry) => ({ ...entry.cardset, role: entry.role }))

	return res.status(200).json({ cardsets })
}

export async function getPublicCardsets(req, res) {
	const { data, error } = await supabase
		.from('cardset')
		.select('*')
		.eq('isPublic', true)

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	return res.status(200).json({ cardsets: data ?? [] })
}

export async function createCardset(req, res) {
	const payload = req.body ?? {}
	const { tags, source_file_name, user_email, course_id, ...cardsetFields } = payload
	const requesterEmail = getRequesterEmail(req)
	const cardsetId = generateInt64Id()
	const normalizedCourseId = course_id == null || course_id === '' ? null : String(course_id)

	if (!requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
	}

	const { data, error } = await supabase
		.from('cardset')
		.insert({ ...cardsetFields, id: cardsetId, course_id: normalizedCourseId })
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	const createdCardset = data?.[0]

	if (!createdCardset) {
		return res.status(500).json({ error: 'Cardset created but id missing in response' })
	}

	const { error: relationError } = await supabase
		.from('card_user')
		.insert({
			user_email: requesterEmail,
			cardset_id: cardsetId,
			role: 'owner',
		})

	if (relationError) {
		await supabase.from('cardset').delete().eq('id', cardsetId)
		return res.status(400).json({ error: relationError.message })
	}

	return res.status(201).json({ cardset: { ...createdCardset, id: cardsetId } })
}

export async function createDeck(req, res) {
	const payload = req.body ?? {}
	const { tags, source_file_name, user_email, course_id, ...cardsetFields } = payload
	const requesterEmail = getRequesterEmail(req)
	const cardsetId = generateInt64Id()
	const normalizedCourseId = course_id == null || course_id === '' ? null : String(course_id)

	if (!requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
	}

	if (!payload.name || typeof payload.name !== 'string') {
		return res.status(400).json({ error: 'Field "name" is required' })
	}

	const { data, error } = await supabase
		.from('cardset')
		.insert({ ...cardsetFields, id: cardsetId, course_id: normalizedCourseId })
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	const createdDeck = data?.[0]
	if (!createdDeck) {
		return res.status(500).json({ error: 'Deck created but id missing in response' })
	}

	const { error: relationError } = await supabase
		.from('card_user')
		.insert({
			user_email: requesterEmail,
			cardset_id: cardsetId,
			role: 'owner',
		})

	if (relationError) {
		await supabase.from('cardset').delete().eq('id', cardsetId)
		return res.status(400).json({ error: relationError.message })
	}

	return res.status(201).json({ cardset: { ...createdDeck, id: cardsetId } })
}

export async function deleteCardset(req, res) {
	const { id } = req.params
	const requesterEmail = getRequesterEmail(req)

	if (!id) {
		return res.status(400).json({ error: 'Path parameter "id" is required' })
	}

	if (!requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
	}

	const { role, error: roleError } = await getCardsetRole(id, requesterEmail)

	if (roleError) {
		return res.status(500).json({ error: roleError.message })
	}

	if (!isOwner(role)) {
		return res.status(403).json({ error: 'Only owners can delete cardsets' })
	}

	const { data, error } = await supabase
		.from('cardset')
		.delete()
		.eq('id', id)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Cardset not found' })
	}

	return res.status(200).json({ message: 'Cardset deleted', cardset: data[0] })
}

export async function updateCardset(req, res) {
	const { id } = req.params
	const requesterEmail = getRequesterEmail(req)
	const payload = req.body ?? {}

	if (!id) {
		return res.status(400).json({ error: 'Path parameter "id" is required' })
	}

	if (!requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
	}

	const { role, error: roleError } = await getCardsetRole(id, requesterEmail)
	if (roleError) {
		return res.status(500).json({ error: roleError.message })
	}

	if (!canWrite(role)) {
		return res.status(403).json({ error: 'Insufficient role for this cardset' })
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
		.from('cardset')
		.update(updatePayload)
		.eq('id', id)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Cardset not found' })
	}

	return res.status(200).json({ cardset: data[0] })
}

export async function forkCardset(req, res) {
	const { id } = req.params
	const requesterEmail = getRequesterEmail(req)

	if (!id) {
		return res.status(400).json({ error: 'Path parameter "id" is required' })
	}

	if (!requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
	}

	const result = await forkCardsetById({ id, requesterEmail })
	if (result.error) {
		return res.status(result.status ?? 400).json({ error: result.error })
	}

	return res.status(201).json({ cardset: result.cardset })
}
