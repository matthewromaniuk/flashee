const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_GENERATE_URL = process.env.OLLAMA_GENERATE_URL || `${DEFAULT_OLLAMA_HOST.replace(/\/$/, '')}/api/generate`
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct'
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '25000', 10)
const DEFAULT_FLASHCARD_COUNT = Number.parseInt(process.env.OLLAMA_FLASHCARD_COUNT || '10', 10)
const DEFAULT_CHUNK_SIZE = Number.parseInt(process.env.OLLAMA_CHUNK_SIZE || '3000', 10)
const QUESTION_TYPE = {
	MULTIPLE_CHOICE: 'multiple-choice',
	TRUE_FALSE: 'true-false',
}

function normalizeKeywords(keywords) {
	if (!Array.isArray(keywords)) {
		return []
	}

	return keywords
		.map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
		.filter(Boolean)
		.slice(0, 25)
}

function buildSystemPrompt() {
	return `Generate exactly 1 concise flashcard for studying purposes with the source text below. ` +
		`Return only a single valid JSON object, not an array. ` +
		`The JSON object must have exactly this structure: {"question":"...","answer":"..."}. ` +
		`The "question" field must contain the full prompt for the learner, and the "answer" field must contain only the correct answer. ` +
		`Do not include markdown, commentary, code fences, extra keys, or extra text outside the JSON object. ` +
		`Create a clear, specific, creative question and a concise answer with a strict 50-word maximum. ` +
		`Vary question styles across outputs and include a mix of standard, true/false, and multiple-choice questions when appropriate. ` +
		`For multiple-choice questions, include exactly 4 options labeled A, B, C, and D. ` +
		`For multiple-choice answers, return exactly one character: A, B, C, or D. ` +
		`Example true/false question format: "True or False: Water boils at 100C at sea level." with answer "True". ` +
		`Example multiple-choice format: "Which organ pumps blood through the body?\nA) Lungs\nB) Liver\nC) Heart\nD) Kidney" with answer "C". ` +
		`Avoid repeating, paraphrasing, or rewording any previously generated flashcard. ` +
		`Prefer a meaningfully different concept or angle each time. ` 
}

function getRequiredQuestionTypeForAttempt(attemptNumber) {
	const rotationIndex = (attemptNumber - 1) % 3

	if (rotationIndex === 1) {
		return QUESTION_TYPE.MULTIPLE_CHOICE
	}

	if (rotationIndex === 2) {
		return QUESTION_TYPE.TRUE_FALSE
	}

	return null
}

function buildPrompt(sourceText, keywords = [], previousFlashcards = [], requiredQuestionType = null) {
	const nextFlashcardNumber = previousFlashcards.length + 1
	const normalizedKeywords = normalizeKeywords(keywords)
	const keywordSection = normalizedKeywords.length > 0
		? [
			'',
			'Potential keywords/topics to prioritize:',
			...normalizedKeywords.map((keyword) => `- ${keyword}`),
		]
		: []

	const formatRequirementSection = requiredQuestionType === QUESTION_TYPE.MULTIPLE_CHOICE
		? [
			'',
			`This is flashcard #${nextFlashcardNumber}. Strict requirement: produce a multiple-choice question.`,
			'The question must contain exactly 4 labeled options in this structure on separate lines:',
			'A) ...',
			'B) ...',
			'C) ...',
			'D) ...',
			'The answer must be exactly one character: A, B, C, or D.',
		]
		: (requiredQuestionType === QUESTION_TYPE.TRUE_FALSE
			? [
				'',
				`This is flashcard #${nextFlashcardNumber}. Strict requirement: produce a true/false question.`,
				'The question must start with "True or False:".',
				'The answer must be exactly "True" or "False".',
			]
			: [])

	const previousContext = previousFlashcards.length > 0
		? [
			'',
			'Previously generated flashcards. Do not repeat these questions or their underlying concepts:',
			...previousFlashcards.map((card, index) => `- ${index + 1}. Q: ${card.question}\n  A: ${card.answer}`),
			'',
			'Important: generate a new flashcard that covers a different fact, detail, or relationship from the source text. Do not create a near-duplicate question with different wording.',
		]
		: []

	return [
		...keywordSection,
		...formatRequirementSection,
		...previousContext,
		'',
		'Source text:',
		sourceText,
	].join('\n')
}

function extractJsonFromString(value) {
	if (typeof value !== 'string') {
		return null
	}

	const firstArrayStart = value.indexOf('[')
	const lastArrayEnd = value.lastIndexOf(']')
	if (firstArrayStart !== -1 && lastArrayEnd !== -1 && lastArrayEnd > firstArrayStart) {
		return value.slice(firstArrayStart, lastArrayEnd + 1)
	}

	const firstObjectStart = value.indexOf('{')
	const lastObjectEnd = value.lastIndexOf('}')
	if (firstObjectStart !== -1 && lastObjectEnd !== -1 && lastObjectEnd > firstObjectStart) {
		return value.slice(firstObjectStart, lastObjectEnd + 1)
	}

	return null
}

function tryParseJson(value) {
	if (typeof value !== 'string') {
		return null
	}

	const jsonString = extractJsonFromString(value)
	if (!jsonString) {
		return null
	}

	try {
		return JSON.parse(jsonString)
	} catch {
		return null
	}
}

function selectGeneratedText(result) {
	if (typeof result?.generated_text === 'string') {
		return result.generated_text
	}

	if (typeof result?.response === 'string') {
		return result.response
	}

	if (Array.isArray(result) && typeof result[0]?.generated_text === 'string') {
		return result[0].generated_text
	}

	if (typeof result === 'string') {
		return result
	}

	return ''
}

async function runLocalInference({
	model,
	systemPrompt,
	prompt,
	timeoutMs,
	generateUrl = DEFAULT_OLLAMA_GENERATE_URL,
}) {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000)

	let response
	try {
		response = await fetch(generateUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				system: systemPrompt,
				prompt,
				stream: false,
				format: 'json',
				options: {
					temperature: 0.35,
					num_predict: 900,
				},
			}),
			signal: controller.signal,
		})
	} finally {
		clearTimeout(timeoutId)
	}

	if (!response.ok) {
		let message = `Local model request failed with status ${response.status}`
		try {
			const payload = await response.json()
			if (typeof payload?.error === 'string' && payload.error.trim()) {
				message = payload.error
			} else if (typeof payload?.message === 'string' && payload.message.trim()) {
				message = payload.message
			}
		} catch {
			// keep fallback message
		}

		if (response.status === 404) {
			message = `Local model endpoint returned 404. Check OLLAMA_GENERATE_URL / OLLAMA_HOST, verify Ollama is running, and ensure model "${model}" is installed (try: ollama pull ${model}).`
		}

		throw new Error(message)
	}

	return response.json()
}

function normalizeFlashcard(entry) {
	if (!entry || typeof entry !== 'object') {
		return null
	}

	const question = typeof entry.question === 'string' ? entry.question.trim() : ''
	const answer = typeof entry.answer === 'string' ? entry.answer.trim() : ''

	if (question && answer) {
		return { question, answer }
	}

	return null
}

function isTrueFalseAnswer(value) {
	if (typeof value !== 'string') {
		return false
	}

	const normalized = value.trim().toLowerCase()
	return normalized === 'true' || normalized === 'false'
}

function areSameFlashcard(card1, card2) {
	if (!card1 || !card2) {
		return false
	}

	// Allow true/false cards to repeat answers without being rejected as duplicates.
	if (isTrueFalseAnswer(card1.answer) || isTrueFalseAnswer(card2.answer)) {
		return false
	}

	return (
		card1.question.trim().toLowerCase() === card2.question.trim().toLowerCase() ||
		card1.answer.trim().toLowerCase() === card2.answer.trim().toLowerCase()
	)
}

function parseFlashcardsFromJson(jsonData) {
	if (Array.isArray(jsonData)) {
		return jsonData
			.map((entry) => normalizeFlashcard(entry))
			.filter((flashcard) => flashcard !== null)
	}

	const singleFlashcard = normalizeFlashcard(jsonData)
	return singleFlashcard ? [singleFlashcard] : []
}

function splitTextIntoChunks(text, chunkSize = DEFAULT_CHUNK_SIZE) {
	if (!text || text.trim().length === 0) {
		return []
	}

	const chunks = []
	let currentChunk = ''
	const safeChunkSize = Math.max(1, Number.parseInt(String(chunkSize || DEFAULT_CHUNK_SIZE), 10))

	const paragraphs = text.split(/\n\n+/)

	function flushCurrentChunk() {
		if (currentChunk) {
			chunks.push(currentChunk.trim())
			currentChunk = ''
		}
	}

	for (const paragraph of paragraphs) {
		if (!paragraph) {
			continue
		}

		// If a paragraph itself is larger than chunk size, split it directly.
		if (paragraph.length > safeChunkSize) {
			flushCurrentChunk()
			for (let i = 0; i < paragraph.length; i += safeChunkSize) {
				const slice = paragraph.slice(i, i + safeChunkSize).trim()
				if (slice) {
					chunks.push(slice)
				}
			}
			continue
		}

		const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph
		if (nextChunk.length > safeChunkSize) {
			flushCurrentChunk()
			currentChunk = paragraph
		} else {
			currentChunk = nextChunk
		}
	}

	flushCurrentChunk()

	return chunks
}

function buildChunksForFlashcardTarget(text, flashcardCount) {
	if (!text || text.trim().length === 0) {
		return []
	}

	const safeFlashcardCount = Math.max(1, Number.parseInt(String(flashcardCount || 1), 10))
	const proportionalChunkSize = Math.max(
		400,
		Math.ceil(text.length / safeFlashcardCount)
	)

	const chunks = splitTextIntoChunks(text, proportionalChunkSize).filter(Boolean)
	return chunks.length > 0 ? chunks : [text]
}

async function generateSingleFlashcard({
	documentText,
	keywords = [],
	model = DEFAULT_MODEL,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	previousFlashcards = [],
	requiredQuestionType = null,
	generateUrl = DEFAULT_OLLAMA_GENERATE_URL,
}) {
	const systemPrompt = buildSystemPrompt()
	const prompt = buildPrompt(documentText, keywords, previousFlashcards, requiredQuestionType)

	const result = await runLocalInference({
		model,
		systemPrompt,
		prompt,
		timeoutMs,
		generateUrl,
	})

	const generatedText = selectGeneratedText(result)
	const jsonData = tryParseJson(generatedText)

	if (!jsonData) {
		console.warn('[aiGenerationClient] Failed to parse JSON from LLM response:', generatedText)
		return null
	}

	const flashcards = parseFlashcardsFromJson(jsonData)
	if (flashcards.length === 0) {
		console.warn('[aiGenerationClient] Parsed JSON but failed to normalize flashcard from LLM response:', generatedText)
	}
	return flashcards.length > 0 ? flashcards[0] : null
}

export async function generateFlashcardsFromDocumentText({
	documentText,
	keywords = [],
	model = DEFAULT_MODEL,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	flashcardCount = DEFAULT_FLASHCARD_COUNT,
	generateUrl = DEFAULT_OLLAMA_GENERATE_URL,
	onProgress = null,
} = {}) {
	if (!documentText || documentText.trim().length === 0) {
		throw new Error('Document text is required')
	}

	console.log('[aiGenerationClient] Starting generation:', {
		model,
		flashcardCount,
		keywords: normalizeKeywords(keywords),
	})
	console.log('[aiGenerationClient] documentText:', documentText)

	const allFlashcards = []
	const maxAttempts = flashcardCount * 2
	const generationChunks = buildChunksForFlashcardTarget(documentText, flashcardCount)
	const activeChunkPool = generationChunks.map((text, index) => ({ index, text }))
	let chunkAttemptIndex = 0
	let attempts = 0
	let consecutiveFailures = 0

	while (allFlashcards.length < flashcardCount && attempts < maxAttempts) {
		attempts++
		const nextFlashcardNumber = allFlashcards.length + 1
		const requiredQuestionType = getRequiredQuestionTypeForAttempt(attempts)
		if (activeChunkPool.length === 0) {
			console.warn('[aiGenerationClient] No remaining chunks to use after successful generations')
			break
		}

		const chunkPoolIndex = chunkAttemptIndex % activeChunkPool.length
		const currentChunk = activeChunkPool[chunkPoolIndex]
		const sourceTextForAttempt = currentChunk?.text || documentText
		chunkAttemptIndex++

		console.log('[aiGenerationClient] Attempt source selection:', {
			attempt: attempts,
			nextFlashcardNumber,
			requiredQuestionType,
			chunkIndex: currentChunk?.index ?? null,
			chunkLength: currentChunk?.text?.length ?? 0,
			remainingChunkCount: activeChunkPool.length,
			sourceTextLength: sourceTextForAttempt.length,
		})

		try {
			const flashcard = await generateSingleFlashcard({
				documentText: sourceTextForAttempt,
				keywords,
				model,
				timeoutMs,
				previousFlashcards: allFlashcards,
				requiredQuestionType,
				generateUrl,
			})

			if (!flashcard) {
				consecutiveFailures++
				console.warn(
					`[aiGenerationClient] Attempt ${attempts}: Failed to parse valid flashcard (consecutive failures: ${consecutiveFailures})`
				)
				
				if (consecutiveFailures >= 8) {
					console.error('[aiGenerationClient] Too many consecutive failures, stopping')
					break
				}
				continue
			}

			consecutiveFailures = 0

			const isDuplicate = allFlashcards.some((existing) =>
				areSameFlashcard(existing, flashcard)
			)
			if (isDuplicate) {
				console.log(
					`[aiGenerationClient] Attempt ${attempts}: Skipping duplicate flashcard - Q: ${flashcard.question.substring(0, 50)}...`
				)
				continue
			}

			allFlashcards.push(flashcard)
			activeChunkPool.splice(chunkPoolIndex, 1)
			console.log('[aiGenerationClient] Retired successful chunk from future attempts', {
				retiredChunkIndex: currentChunk?.index ?? null,
				remainingChunkCount: activeChunkPool.length,
			})
			console.log(
				`[aiGenerationClient] Generated flashcard ${allFlashcards.length}/${flashcardCount} on attempt ${attempts}`
			)

			// Notify progress if callback provided
			if (typeof onProgress === 'function') {
				onProgress({
					current: allFlashcards.length,
					maximum: flashcardCount,
				})
			}
		} catch (error) {
			console.error(
				`[aiGenerationClient] Error on attempt ${attempts}:`,
				error.message
			)
			throw error
		}
	}

	console.log('[aiGenerationClient] Loop finished:', {
		generated: allFlashcards.length,
		requested: flashcardCount,
		attempts,
		maxAttempts,
	})

	if (allFlashcards.length === 0) {
		throw new Error('No valid flashcards were generated from the text')
	}

	if (allFlashcards.length < flashcardCount) {
		console.warn(
			`[aiGenerationClient] Only generated ${allFlashcards.length}/${flashcardCount} flashcards after ${attempts} attempts. Returning partial result.`
		)
	}

	return {
		flashcards: allFlashcards,
		totalGenerated: allFlashcards.length,
	}
}
