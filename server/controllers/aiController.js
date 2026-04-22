import { generateFlashcardsFromDocumentText } from '../lib/aiGenerationClient.js'
import { extractTextFromFile } from '../lib/documentExtractor.js'

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

function extractTextPayload(req) {
  const body = req.body ?? {}

  if (typeof body.documentText !== 'string' || !body.documentText.trim()) {
    return null
  }

  const bodyKeywords = parseKeywordsFromBody(body)
  const headerKeywords = parseKeywordsFromHeader(req.headers['x-ai-keywords'])

  return {
    documentText: body.documentText,
    keywords: bodyKeywords.length > 0 ? bodyKeywords : headerKeywords,
    flashcardCount: parseFlashcardCount(body.flashcardCount ?? req.headers['x-ai-flashcard-count']),
  }
}

export function createAiFlashcardHandler(generate = generateFlashcardsFromDocumentText) {
  return async function aiFlashcards(req, res) {
    console.log('[aiController] Incoming /api/ai/flashcards request')
    
    let documentText = null
    let payload = null

    // Try to extract documentText from JSON body first (existing flow)
    payload = extractTextPayload(req)

    // If not from JSON, try to extract from multipart file upload
    if (!payload && req.file) {
      console.log('[aiController] Attempting to extract text from uploaded file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      })

      try {
        documentText = await extractTextFromFile(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        )

        if (!documentText || !documentText.trim()) {
          return res.status(400).json({
            error: 'The uploaded file is empty or could not be read',
          })
        }

        const bodyKeywords = parseKeywordsFromBody(req.body)
        const headerKeywords = parseKeywordsFromHeader(req.headers['x-ai-keywords'])

        payload = {
          documentText,
          keywords: bodyKeywords.length > 0 ? bodyKeywords : headerKeywords,
          flashcardCount: parseFlashcardCount(
            req.body?.flashcardCount ?? req.headers['x-ai-flashcard-count']
          ),
        }

        console.log('[aiController] File extraction successful:', {
          textLength: documentText.length,
          fileName: req.file.originalname,
        })
      } catch (error) {
        console.error('[aiController] File extraction failed:', error.message)
        return res.status(400).json({
          error: error.message || 'Failed to extract text from uploaded file',
        })
      }
    }

    if (!payload) {
      console.warn('[aiController] Rejected request: no text content provided')
      return res.status(400).json({
        error: 'Provide a documentText field with text content or upload a file',
      })
    }

    console.log('[aiController] Payload summary:', {
      documentTextLength: typeof payload.documentText === 'string' ? payload.documentText.length : 0,
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

      if (flashcards.length < payload.flashcardCount) {
        console.warn('[aiController] Flashcard count below requested', {
          requested: payload.flashcardCount,
          actual: flashcards.length,
        })
        return res.status(200).json({
          flashcards,
          count: flashcards.length,
          warning: `Generated ${flashcards.length} flashcards instead of ${payload.flashcardCount} requested`,
        })
      }

      return res.status(200).json({
        flashcards,
        count: flashcards.length,
      })
    } catch (error) {
      console.error('Flashcard generation failed', error)
      return res.status(502).json({
        error: error?.message || 'Flashcard generation failed',
      })
    }
  }
}

export function createAiFlashcardsStreamHandler(generate = generateFlashcardsFromDocumentText) {
  return async function aiFlashcardsStream(req, res) {
    console.log('[aiController-stream] Incoming /api/ai/flashcards-stream request')
    
    // Set up SSE response headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    
    let documentText = null
    let payload = null

    // Try to extract documentText from JSON body first (existing flow)
    payload = extractTextPayload(req)

    // If not from JSON, try to extract from multipart file upload
    if (!payload && req.file) {
      console.log('[aiController-stream] Attempting to extract text from uploaded file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      })

      try {
        documentText = await extractTextFromFile(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        )

        if (!documentText || !documentText.trim()) {
          res.write(`data: ${JSON.stringify({ error: 'The uploaded file is empty or could not be read' })}\n\n`)
          res.end()
          return
        }

        const bodyKeywords = parseKeywordsFromBody(req.body)
        const headerKeywords = parseKeywordsFromHeader(req.headers['x-ai-keywords'])

        payload = {
          documentText,
          keywords: bodyKeywords.length > 0 ? bodyKeywords : headerKeywords,
          flashcardCount: parseFlashcardCount(
            req.body?.flashcardCount ?? req.headers['x-ai-flashcard-count']
          ),
        }

        console.log('[aiController-stream] File extraction successful:', {
          textLength: documentText.length,
          fileName: req.file.originalname,
        })
      } catch (error) {
        console.error('[aiController-stream] File extraction failed:', error.message)
        res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to extract text from uploaded file' })}\n\n`)
        res.end()
        return
      }
    }

    if (!payload) {
      console.warn('[aiController-stream] Rejected request: no text content provided')
      res.write(`data: ${JSON.stringify({ error: 'Provide a documentText field with text content or upload a file' })}\n\n`)
      res.end()
      return
    }

    console.log('[aiController-stream] Payload summary:', {
      documentTextLength: typeof payload.documentText === 'string' ? payload.documentText.length : 0,
      keywordCount: Array.isArray(payload.keywords) ? payload.keywords.length : 0,
      flashcardCount: payload.flashcardCount,
    })

    try {
      const progressUpdates = []
      const onProgress = (progress) => {
        progressUpdates.push(progress)
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`)
        console.log(`[aiController-stream] Progress: ${progress.current}/${progress.maximum}`)
      }

      const { flashcards } = await generate({
        ...payload,
        onProgress,
      })

      console.log('[aiController-stream] Generation result:', {
        flashcardCount: Array.isArray(flashcards) ? flashcards.length : 0,
      })

      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        console.warn('[aiController-stream] No flashcards generated')
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'The AI service did not return any flashcards' })}\n\n`)
        res.end()
        return
      }

      // Send complete event with all flashcards
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        flashcards,
        count: flashcards.length,
        warning: flashcards.length < payload.flashcardCount
          ? `Generated ${flashcards.length} flashcards instead of ${payload.flashcardCount} requested`
          : null,
      })}\n\n`)
      res.end()
    } catch (error) {
      console.error('[aiController-stream] Flashcard generation failed', error)
      res.write(`data: ${JSON.stringify({ type: 'error', error: error?.message || 'Flashcard generation failed' })}\n\n`)
      res.end()
    }
  }
}

export const createAiFlashcards = createAiFlashcardHandler()
export const createAiFlashcardsStream = createAiFlashcardsStreamHandler()
export const aiFlashcardUploadLimit = MAX_UPLOAD_BYTES