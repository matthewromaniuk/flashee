import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { authorizeCardsetAccess } from '../lib/cardsetAccess.js'

export async function listFlashcards(req, res) {
	const { cardsetId } = req.params

	if (!cardsetId) {
		return res.status(400).json({ error: 'Path parameter cardsetId is required' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'read')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.select('*')
		.eq('cardset_id', cardsetId)

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	const statusByFlashcardId = new Map()

	if (authz.requesterEmail) {
		const { data: statusRows, error: statusError } = await supabase
			.from('flashcard_status')
			.select('flashcard_id,isCorrect')
			.eq('cardset_id', cardsetId)
			.eq('user_email', authz.requesterEmail)

		if (statusError) {
			return res.status(500).json({ error: statusError.message })
		}

		for (const status of statusRows ?? []) {
			statusByFlashcardId.set(String(status.flashcard_id), status)
		}
	}

	const flashcardsWithStatus = (data ?? []).map((flashcard) => {
		const status = statusByFlashcardId.get(String(flashcard.id))
		return {
			...flashcard,
			hasStatus: Boolean(status),
			isCorrect: typeof status?.isCorrect === 'boolean' ? status.isCorrect : null,
		}
	})

	return res.status(200).json({ flashcards: flashcardsWithStatus })
}

export async function createFlashcard(req, res) {
	const { cardsetId } = req.params
	const payload = req.body ?? {}

	if (!cardsetId) {
		return res.status(400).json({ error: 'Path parameter cardsetId is required' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'write')
	if (!authz.allowed) return

	const { isCorrect, ...flashcardFields } = payload
	const initialIsCorrect = false
	const flashcardId = generateInt64Id()
	const flashcardPayload = {
		...flashcardFields,
		cardset_id: cardsetId,
		id: flashcardId,
	}

	const { data, error } = await supabase
		.from('flashcard')
		.insert(flashcardPayload)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	const createdFlashcard = data?.[0]
	if (!createdFlashcard) {
		return res.status(500).json({ error: 'Flashcard created but id missing in response' })
	}

	const { error: statusError } = await supabase
		.from('flashcard_status')
		.upsert({
			user_email: authz.requesterEmail,
			cardset_id: cardsetId,
			flashcard_id: flashcardId,
			isCorrect: initialIsCorrect,
		}, {
			onConflict: 'user_email,cardset_id,flashcard_id',
		})

	if (statusError) {
		await supabase
			.from('flashcard')
			.delete()
			.eq('id', flashcardId)
			.eq('cardset_id', cardsetId)

		return res.status(400).json({ error: statusError.message })
	}

	return res.status(201).json({
		flashcard: { ...createdFlashcard, id: flashcardId },
		status: {
			user_email: authz.requesterEmail,
			cardset_id: cardsetId,
			flashcard_id: flashcardId,
			isCorrect: initialIsCorrect,
		},
	})
}

export async function bulkCreateFlashcards(req, res) {
	const { cardsetId } = req.params
	const { flashcards } = req.body ?? {}

	if (!cardsetId) {
		return res.status(400).json({ error: 'Path parameter cardsetId is required' })
	}

	if (!Array.isArray(flashcards) || flashcards.length === 0) {
		return res.status(400).json({ error: 'Field flashcards must be a non-empty array' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'write')
	if (!authz.allowed) return

	const preparedRows = flashcards.map((flashcard) => {
		const { isCorrect, ...flashcardPayload } = flashcard ?? {}
		return {
			flashcardPayload: {
				...flashcardPayload,
				cardset_id: cardsetId,
				id: generateInt64Id(),
			},
			isCorrect: false,
		}
	})

	const { data, error } = await supabase
		.from('flashcard')
		.insert(preparedRows.map((row) => row.flashcardPayload))
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	const createdFlashcards = data ?? []
	if (createdFlashcards.length !== preparedRows.length) {
		return res.status(500).json({ error: 'Unexpected number of created flashcards' })
	}

	const statusRows = createdFlashcards.map((flashcard, index) => ({
		user_email: authz.requesterEmail,
		cardset_id: cardsetId,
		flashcard_id: preparedRows[index].flashcardPayload.id,
		isCorrect: preparedRows[index].isCorrect,
	}))

	const { error: statusError } = await supabase
		.from('flashcard_status')
		.upsert(statusRows, {
			onConflict: 'user_email,cardset_id,flashcard_id',
		})

	if (statusError) {
		return res.status(400).json({ error: statusError.message })
	}

	return res.status(201).json({ flashcards: createdFlashcards })
}

export async function updateFlashcardStatus(req, res) {
	const { cardsetId, flashcardId } = req.params
	const { isCorrect } = req.body ?? {}

	if (!cardsetId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters cardsetId and flashcardId are required' })
	}

	if (typeof isCorrect !== 'boolean') {
		return res.status(400).json({ error: 'Field isCorrect must be a boolean' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'read')
	if (!authz.allowed) return

	if (!authz.requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required to update flashcard status' })
	}

	const { data: flashcard, error: flashcardError } = await supabase
		.from('flashcard')
		.select('id')
		.eq('id', flashcardId)
		.eq('cardset_id', cardsetId)
		.maybeSingle()

	if (flashcardError) {
		return res.status(500).json({ error: flashcardError.message })
	}

	if (!flashcard) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	const { data: statusRows, error: statusError } = await supabase
		.from('flashcard_status')
		.upsert({
			user_email: authz.requesterEmail,
			cardset_id: cardsetId,
			flashcard_id: flashcardId,
			isCorrect,
		}, {
			onConflict: 'user_email,cardset_id,flashcard_id',
		})
		.select('*')

	if (statusError) {
		return res.status(400).json({ error: statusError.message })
	}

	return res.status(200).json({ status: statusRows?.[0] ?? null })
}

export async function getFlashcard(req, res) {
	const { cardsetId, flashcardId } = req.params

	if (!cardsetId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters cardsetId and flashcardId are required' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'read')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.select('*')
		.eq('id', flashcardId)
		.eq('cardset_id', cardsetId)
		.maybeSingle()

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	if (!data) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ flashcard: data })
}

export async function updateFlashcard(req, res) {
	const { cardsetId, flashcardId } = req.params
	const payload = req.body ?? {}

	if (!cardsetId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters cardsetId and flashcardId are required' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'write')
	if (!authz.allowed) return

	if ('cardset_id' in payload && payload.cardset_id !== cardsetId) {
		return res.status(400).json({ error: 'cardset_id in body must match path cardsetId' })
	}

	const updatePayload = {
		...payload,
		cardset_id: cardsetId,
	}

	const { data, error } = await supabase
		.from('flashcard')
		.update(updatePayload)
		.eq('id', flashcardId)
		.eq('cardset_id', cardsetId)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ flashcard: data[0] })
}

export async function deleteFlashcard(req, res) {
	const { cardsetId, flashcardId } = req.params

	if (!cardsetId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters cardsetId and flashcardId are required' })
	}

	const authz = await authorizeCardsetAccess(req, res, cardsetId, 'write')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.delete()
		.eq('id', flashcardId)
		.eq('cardset_id', cardsetId)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ message: 'Flashcard deleted', flashcard: data[0] })
}
