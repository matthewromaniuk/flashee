const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_GENERATE_URL = process.env.OLLAMA_GENERATE_URL || `${DEFAULT_OLLAMA_HOST.replace(/\/$/, '')}/api/generate`
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct'
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10)
const DEFAULT_FLASHCARD_COUNT = Number.parseInt(process.env.OLLAMA_FLASHCARD_COUNT || '10', 10)
const DEFAULT_CHUNK_SIZE = Number.parseInt(process.env.OLLAMA_CHUNK_SIZE || '3000', 10)

function normalizeKeywords(keywords) {
	if (!Array.isArray(keywords)) {
		return []
	}

	return keywords
		.map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
		.filter(Boolean)
		.slice(0, 25)
}

function buildSystemPrompt(flashcardCount) {
	return `Generate ${flashcardCount} concise study flashcards with the below source text. ` +
		`Target exactly ${flashcardCount} unless source text is critically insufficient. ` +
		`Break broad topics into multiple specific Question and Answer pairs to reach the target count. ` +
		`Use distinct questions; avoid near-duplicates. ` +
		`Return only valid JSON using this exact schema: [{"question":"...","answer":"..."}]. ` +
		`Do not include markdown, commentary, code fences, or extra text. only JSON. ` +
		`If you cannot generate the target number of flashcards, return as many as possible but do not return zero flashcards.`
}

function buildPrompt(sourceText, keywords = []) {
	const normalizedKeywords = normalizeKeywords(keywords)
	const keywordSection = normalizedKeywords.length > 0
		? [
			'',
			'Potential keywords/topics to prioritize:',
			...normalizedKeywords.map((keyword) => `- ${keyword}`),
		]
		: []

	return [
		...keywordSection,
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

function parseFlashcardsFromJson(jsonData) {
	if (!Array.isArray(jsonData)) {
		return []
	}

	return jsonData
		.map((entry) => normalizeFlashcard(entry))
		.filter((flashcard) => flashcard !== null)
}

function splitTextIntoChunks(text, chunkSize = DEFAULT_CHUNK_SIZE) {
	if (!text || text.trim().length === 0) {
		return []
	}

	const chunks = []
	let currentChunk = ''

	const paragraphs = text.split(/\n\n+/)

	for (const paragraph of paragraphs) {
		if ((currentChunk + paragraph).length > chunkSize) {
			if (currentChunk) {
				chunks.push(currentChunk.trim())
			}
			currentChunk = paragraph
		} else {
			currentChunk += (currentChunk ? '\n\n' : '') + paragraph
		}
	}

	if (currentChunk) {
		chunks.push(currentChunk.trim())
	}

	return chunks
}

export async function generateFlashcardsFromText({
	textContent,
	keywords = [],
	model = DEFAULT_MODEL,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	flashcardCount = DEFAULT_FLASHCARD_COUNT,
	chunkSize = DEFAULT_CHUNK_SIZE,
	generateUrl = DEFAULT_OLLAMA_GENERATE_URL,
} = {}) {
	if (!textContent || textContent.trim().length === 0) {
		throw new Error('Text content is required')
	}

	const flashcardsPerChunk = Math.max(1, Math.floor(flashcardCount / 3))
	const systemPrompt = buildSystemPrompt(flashcardsPerChunk)

	const chunks = splitTextIntoChunks(textContent, chunkSize)
	if (chunks.length === 0) {
		throw new Error('No valid text chunks to process')
	}

	console.log('[aiGenerationClient] Processing:', {
		model,
		chunkCount: chunks.length,
		flashcardsPerChunk,
		keywords: normalizeKeywords(keywords),
	})

	const allFlashcards = []

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i]
		const prompt = buildPrompt(chunk, keywords)

		console.log(`[aiGenerationClient] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`)

		try {
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
				console.warn(`[aiGenerationClient] Chunk ${i + 1} did not produce valid JSON`)
				continue
			}

			const flashcards = parseFlashcardsFromJson(jsonData)
			console.log(`[aiGenerationClient] Chunk ${i + 1} generated ${flashcards.length} flashcards`)

			allFlashcards.push(...flashcards)
		} catch (error) {
			console.error(`[aiGenerationClient] Error processing chunk ${i + 1}:`, error.message)
			throw error
		}
	}

	if (allFlashcards.length === 0) {
		throw new Error('No valid flashcards were generated from the text')
	}

	return {
		flashcards: allFlashcards,
		chunkCount: chunks.length,
		totalGenerated: allFlashcards.length,
	}
}