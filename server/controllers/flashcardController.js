//Controller functions for handling flashcard-related API endpoints
import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { authorizeDeckAccess } from '../lib/deckAccess.js'

//List flashcards for a deck
export async function listFlashcards(req, res) {
	const { deckId } = req.params

	if (!deckId) {
		return res.status(400).json({ error: 'Path parameter deckId is required' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'read')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.select('*')
		.eq('deck_id', deckId)

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	const statusByFlashcardId = new Map()

	if (authz.requesterEmail) {
		const { data: statusRows, error: statusError } = await supabase
			.from('flashcard_status')
			.select('flashcard_id,isCorrect')
			.eq('deck_id', deckId)
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

//Create a new flashcard in a deck
export async function createFlashcard(req, res) {
	const { deckId } = req.params
	const payload = req.body ?? {}

	if (!deckId) {
		return res.status(400).json({ error: 'Path parameter deckId is required' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'write')
	if (!authz.allowed) return

	const { isCorrect, ...flashcardFields } = payload
	const initialIsCorrect = false
	const flashcardId = generateInt64Id()
	const flashcardPayload = {
		...flashcardFields,
		deck_id: deckId,
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
			deck_id: deckId,
			flashcard_id: flashcardId,
			isCorrect: initialIsCorrect,
		}, {
			onConflict: 'user_email,deck_id,flashcard_id',
		})

	if (statusError) {
		await supabase
			.from('flashcard')
			.delete()
			.eq('id', flashcardId)
			.eq('deck_id', deckId)

		return res.status(400).json({ error: statusError.message })
	}

	return res.status(201).json({
		flashcard: { ...createdFlashcard, id: flashcardId },
		status: {
			user_email: authz.requesterEmail,
			deck_id: deckId,
			flashcard_id: flashcardId,
			isCorrect: initialIsCorrect,
		},
	})
}

//Bulk create flashcards in a deck, takes in array of JSON flashcard objects in the request body
export async function bulkCreateFlashcards(req, res) {
	const { deckId } = req.params
	const { flashcards } = req.body ?? {}

	if (!deckId) {
		return res.status(400).json({ error: 'Path parameter deckId is required' })
	}

	if (!Array.isArray(flashcards) || flashcards.length === 0) {
		return res.status(400).json({ error: 'Field flashcards must be a non-empty array' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'write')
	if (!authz.allowed) return

	const preparedRows = flashcards.map((flashcard) => {
		const { isCorrect, ...flashcardPayload } = flashcard ?? {}
		return {
			flashcardPayload: {
				...flashcardPayload,
				deck_id: deckId,
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
		deck_id: deckId,
		flashcard_id: preparedRows[index].flashcardPayload.id,
		isCorrect: preparedRows[index].isCorrect,
	}))

	const { error: statusError } = await supabase
		.from('flashcard_status')
		.upsert(statusRows, {
			onConflict: 'user_email,deck_id,flashcard_id',
		})

	if (statusError) {
		return res.status(400).json({ error: statusError.message })
	}

	return res.status(201).json({ flashcards: createdFlashcards })
}

//Update the isCorrect status for a flashcard for the requesting user
export async function updateFlashcardStatus(req, res) {
	const { deckId, flashcardId } = req.params
	const { isCorrect } = req.body ?? {}

	if (!deckId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters deckId and flashcardId are required' })
	}

	if (typeof isCorrect !== 'boolean') {
		return res.status(400).json({ error: 'Field isCorrect must be a boolean' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'read')
	if (!authz.allowed) return

	if (!authz.requesterEmail) {
		return res.status(400).json({ error: 'Requester email is required to update flashcard status' })
	}

	const { data: flashcard, error: flashcardError } = await supabase
		.from('flashcard')
		.select('id')
		.eq('id', flashcardId)
		.eq('deck_id', deckId)
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
			deck_id: deckId,
			flashcard_id: flashcardId,
			isCorrect,
		}, {
			onConflict: 'user_email,deck_id,flashcard_id',
		})
		.select('*')

	if (statusError) {
		return res.status(400).json({ error: statusError.message })
	}

	return res.status(200).json({ status: statusRows?.[0] ?? null })
}

//Get details of a single flashcard
export async function getFlashcard(req, res) {
	const { deckId, flashcardId } = req.params

	if (!deckId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters deckId and flashcardId are required' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'read')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.select('*')
		.eq('id', flashcardId)
		.eq('deck_id', deckId)
		.maybeSingle()

	if (error) {
		return res.status(500).json({ error: error.message })
	}

	if (!data) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ flashcard: data })
}

//Update flashcard details like question or answer
export async function updateFlashcard(req, res) {
	const { deckId, flashcardId } = req.params
	const payload = req.body ?? {}

	if (!deckId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters deckId and flashcardId are required' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'write')
	if (!authz.allowed) return

	if ('deck_id' in payload && payload.deck_id !== deckId) {
		return res.status(400).json({ error: 'deck_id in body must match path deckId' })
	}

	const { deck_id: payloadDeckId, ...flashcardFields } = payload
	const updatePayload = {
		...flashcardFields,
		deck_id: deckId,
	}

	const { data, error } = await supabase
		.from('flashcard')
		.update(updatePayload)
		.eq('id', flashcardId)
		.eq('deck_id', deckId)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ flashcard: data[0] })
}

//Delete a flashcard from a deck
export async function deleteFlashcard(req, res) {
	const { deckId, flashcardId } = req.params

	if (!deckId || !flashcardId) {
		return res.status(400).json({ error: 'Path parameters deckId and flashcardId are required' })
	}

	const authz = await authorizeDeckAccess(req, res, deckId, 'write')
	if (!authz.allowed) return

	const { data, error } = await supabase
		.from('flashcard')
		.delete()
		.eq('id', flashcardId)
		.eq('deck_id', deckId)
		.select('*')

	if (error) {
		return res.status(400).json({ error: error.message })
	}

	if (!data || data.length === 0) {
		return res.status(404).json({ error: 'Flashcard not found' })
	}

	return res.status(200).json({ message: 'Flashcard deleted', flashcard: data[0] })
}
