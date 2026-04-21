import { generateFlashcardsFromText } from '../lib/aiGenerationClient.js'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const DEFAULT_FLASHCARD_COUNT = 10
const MIN_FLASHCARD_COUNT = 1
const MAX_FLASHCARD_COUNT = 50

function parseFlashcardCount(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FLASHCARD_COUNT
  }

  return Math.min(MAX_FLASHCARD_COUNT, Math.max(MIN_FLASHCARD_COUNT, parsed))
}

function parseKeywordsFromHeader(rawHeaderValue) {
  if (typeof rawHeaderValue !== 'string' || !rawHeaderValue.trim()) {
    return []
  }

  return rawHeaderValue
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function parseKeywordsFromBody(body) {
  if (Array.isArray(body?.keywords)) {
    return body.keywords
      .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
      .filter(Boolean)
  }

  if (typeof body?.keywords === 'string' && body.keywords.trim()) {
    return parseKeywordsFromHeader(body.keywords)
  }

  return []
}

function extractDocumentPayload(req) {
  const body = req.body ?? {}

  if (Buffer.isBuffer(body)) {
    return {
      buffer: body,
      fileName: req.headers['x-file-name'] || 'document.pdf',
      mimeType: req.headers['x-file-type'] || req.headers['content-type'] || 'application/octet-stream',
      keywords: parseKeywordsFromHeader(req.headers['x-ai-keywords']),
      flashcardCount: parseFlashcardCount(req.headers['x-ai-flashcard-count']),
    }
  }

  if (body instanceof Uint8Array) {
    return {
      buffer: Buffer.from(body),
      fileName: req.headers['x-file-name'] || 'document.pdf',
      mimeType: req.headers['x-file-type'] || req.headers['content-type'] || 'application/octet-stream',
      keywords: parseKeywordsFromHeader(req.headers['x-ai-keywords']),
      flashcardCount: parseFlashcardCount(req.headers['x-ai-flashcard-count']),
    }
  }

  if (typeof body.documentText === 'string' && body.documentText.trim()) {
    const bodyKeywords = parseKeywordsFromBody(body)
    const headerKeywords = parseKeywordsFromHeader(req.headers['x-ai-keywords'])

    return {
      documentText: body.documentText,
      fileName: body.fileName || body.documentName || 'document.txt',
      mimeType: body.mimeType || 'text/plain',
      keywords: bodyKeywords.length > 0 ? bodyKeywords : headerKeywords,
      flashcardCount: parseFlashcardCount(body.flashcardCount ?? req.headers['x-ai-flashcard-count']),
    }
  }

  return null
}

function extractTextPayload(req) {
  const body = req.body ?? {}

  if (typeof body.documentText === 'string' && body.documentText.trim()) {
    const bodyKeywords = parseKeywordsFromBody(body)
    const headerKeywords = parseKeywordsFromHeader(req.headers['x-ai-keywords'])

    return {
      textContent: body.documentText,
      keywords: bodyKeywords.length > 0 ? bodyKeywords : headerKeywords,
      flashcardCount: parseFlashcardCount(body.flashcardCount ?? req.headers['x-ai-flashcard-count']),
    }
  }

  return null
}

export function createAiFlashcardHandler(generate = generateFlashcardsFromText) {
  return async function aiFlashcards(req, res) {
    console.log('[aiController] Incoming /api/ai/flashcards request')
    const payload = extractTextPayload(req)

    if (!payload) {
      console.warn('[aiController] Rejected request: no document payload provided')
      return res.status(400).json({
        error: 'Provide a documentText field with text content',
      })
    }

    console.log('[aiController] Payload summary:', {
      textContentLength: typeof payload.textContent === 'string' ? payload.textContent.length : 0,
      keywordCount: Array.isArray(payload.keywords) ? payload.keywords.length : 0,
      flashcardCount: payload.flashcardCount,
    })

    try {
      const { flashcards } = await generate(payload)
      console.log('[aiController] Generation result:', {
        flashcardCount: Array.isArray(flashcards) ? flashcards.length : 0,
      })

      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        console.warn('[aiController] No flashcards generated')
        return res.status(502).json({
          error: 'The AI service did not return any flashcards',
        })
      }

      if (flashcards.length !== payload.flashcardCount) {
        console.warn('[aiController] Flashcard count mismatch', {
          requested: payload.flashcardCount,
          actual: flashcards.length,
        })
        return res.status(502).json({
          error: `AI returned ${flashcards.length} flashcards, expected exactly ${payload.flashcardCount}`,
        })
      }

      return res.status(200).json({
        flashcards,
        count: flashcards.length,
        sourceFileName: payload.fileName,
      })
    } catch (error) {
      console.error('Flashcard generation failed', error)
      return res.status(502).json({
        error: error?.message || 'Flashcard generation failed',
      })
    }
  }
}

export const createAiFlashcards = createAiFlashcardHandler()
export const aiFlashcardUploadLimit = MAX_UPLOAD_BYTES