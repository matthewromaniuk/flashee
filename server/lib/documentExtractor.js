import path from 'path'
import pdfParse from 'pdf-parse'
import JSZip from 'jszip'

/**
 * Extract text from a PDF buffer
 */
async function extractPdfText(buffer) {
	try {
		const data = await pdfParse(buffer)
		return data.text || ''
	} catch (error) {
		throw new Error(`Failed to parse PDF: ${error.message}`)
	}
}

/**
 * Extract text from a DOCX buffer
 * DOCX is a ZIP file containing XML documents
 */
async function extractDocxText(buffer) {
	try {
		const zip = new JSZip()
		await zip.loadAsync(buffer)

		// Read the main document XML
		const docXml = zip.file('word/document.xml')
		if (!docXml) {
			throw new Error('No document.xml found in DOCX file')
		}

		const xmlContent = await docXml.async('string')

		// Extract text from paragraphs and runs
		// Simple regex-based extraction - matches <w:t>text</w:t> tags
		const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
		const text = textMatches
			.map((match) => match.replace(/<[^>]+>/g, ''))
			.join(' ')

		return text || ''
	} catch (error) {
		throw new Error(`Failed to parse DOCX: ${error.message}`)
	}
}

/**
 * Extract text from a PPTX buffer
 * PPTX is a ZIP file containing XML slides
 */
async function extractPptxText(buffer) {
	try {
		const zip = new JSZip()
		await zip.loadAsync(buffer)

		const texts = []

		// Iterate through slide files
		for (const [filePath, file] of Object.entries(zip.files)) {
			// Match slide files: ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
			if (filePath.match(/^ppt\/slides\/slide\d+\.xml$/)) {
				const xmlContent = await file.async('string')

				// Extract text from shapes and text runs
				// Matches <a:t>text</a:t> tags
				const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
				const slideText = textMatches
					.map((match) => match.replace(/<[^>]+>/g, ''))
					.join(' ')

				if (slideText) {
					texts.push(slideText)
				}
			}
		}

		return texts.join('\n') || ''
	} catch (error) {
		throw new Error(`Failed to parse PPTX: ${error.message}`)
	}
}

/**
 * Extract text from a file buffer based on MIME type or file extension
 */
export async function extractTextFromFile(buffer, mimeType, fileName = '') {
	// Determine format from MIME type or file extension
	const format = mimeType?.toLowerCase() || ''
	const ext = path.extname(fileName).toLowerCase()

	if (
		format.includes('pdf') ||
		ext === '.pdf'
	) {
		return extractPdfText(buffer)
	}

	if (
		format.includes('wordprocessingml') ||
		format.includes('vnd.openxmlformats-officedocument.wordprocessingml') ||
		ext === '.docx'
	) {
		return extractDocxText(buffer)
	}

	if (
		format.includes('presentationml') ||
		format.includes('vnd.openxmlformats-officedocument.presentationml') ||
		ext === '.pptx'
	) {
		return extractPptxText(buffer)
	}

	if (
		format.includes('text') ||
		format.includes('plain') ||
		ext === '.txt'
	) {
		return buffer.toString('utf-8')
	}

	throw new Error(
		`Unsupported file format. Accepted: PDF, DOCX, PPTX, TXT. Received: ${format || ext || 'unknown'}`
	)
}
