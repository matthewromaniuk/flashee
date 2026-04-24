//Deck forking logic
import { supabase } from './supabaseClient.js'
import { generateInt64Id } from './int64Id.js'

//Fork a deck by its ID, creating a new deck with the same content and assigning ownership to the requester
export async function forkDeckById({ id, requesterEmail }) {
  const { data: sourceDeck, error: fetchError } = await supabase
    .from('deck')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !sourceDeck) {
    return { error: 'Source deck not found', status: 404 }
  }

  const forkedDeckId = generateInt64Id()

  const { data: newDeck, error: createError } = await supabase
    .from('deck')
    .insert({
      id: forkedDeckId,
      name: sourceDeck.name,
      description: sourceDeck.description,
      isPublic: sourceDeck.isPublic,
      course_id: null,
    })
    .select('*')

  if (createError) {
    return { error: 'Failed to create forked deck: ' + createError.message, status: 400 }
  }

  const createdDeck = newDeck?.[0]
  if (!createdDeck) {
    return { error: 'Deck forked but id missing in response', status: 500 }
  }

  const { data: sourceFlashcards, error: flashcardFetchError } = await supabase
    .from('flashcard')
    .select('*')
    .eq('deck_id', id)

  if (flashcardFetchError) {
    await supabase.from('deck').delete().eq('id', forkedDeckId)
    return { error: 'Failed to fetch flashcards: ' + flashcardFetchError.message, status: 500 }
  }

  if (sourceFlashcards && sourceFlashcards.length > 0) {
    const flashcardsToInsert = sourceFlashcards.map((flashcard) => ({
      id: generateInt64Id(),
      deck_id: forkedDeckId,
      question: flashcard.question,
      answer: flashcard.answer,
    }))

    const { error: flashcardCreateError } = await supabase
      .from('flashcard')
      .insert(flashcardsToInsert)

    if (flashcardCreateError) {
      await supabase.from('deck').delete().eq('id', forkedDeckId)
      return { error: 'Failed to copy flashcards: ' + flashcardCreateError.message, status: 500 }
    }
  }

  const { error: relationError } = await supabase
    .from('deck_user')
    .insert({
      user_email: requesterEmail,
      deck_id: forkedDeckId,
      role: 'owner',
    })

  if (relationError) {
    await supabase.from('deck').delete().eq('id', forkedDeckId)
    return { error: 'Failed to set ownership: ' + relationError.message, status: 400 }
  }

  return { deck: createdDeck }
}
