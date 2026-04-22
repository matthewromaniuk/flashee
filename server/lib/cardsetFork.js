import { supabase } from './supabaseClient.js'
import { generateInt64Id } from './int64Id.js'

export async function forkCardsetById({ id, requesterEmail }) {
  const { data: sourceCardset, error: fetchError } = await supabase
    .from('cardset')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !sourceCardset) {
    return { error: 'Source cardset not found', status: 404 }
  }

  const forkedCardsetId = generateInt64Id()

  const { data: newCardset, error: createError } = await supabase
    .from('cardset')
    .insert({
      id: forkedCardsetId,
      name: sourceCardset.name,
      description: sourceCardset.description,
      isPublic: sourceCardset.isPublic,
      course_id: null,
    })
    .select('*')

  if (createError) {
    return { error: 'Failed to create forked cardset: ' + createError.message, status: 400 }
  }

  const createdCardset = newCardset?.[0]
  if (!createdCardset) {
    return { error: 'Cardset forked but id missing in response', status: 500 }
  }

  const { data: sourceFlashcards, error: flashcardFetchError } = await supabase
    .from('flashcard')
    .select('*')
    .eq('cardset_id', id)

  if (flashcardFetchError) {
    await supabase.from('cardset').delete().eq('id', forkedCardsetId)
    return { error: 'Failed to fetch flashcards: ' + flashcardFetchError.message, status: 500 }
  }

  if (sourceFlashcards && sourceFlashcards.length > 0) {
    const flashcardsToInsert = sourceFlashcards.map((flashcard) => ({
      id: generateInt64Id(),
      cardset_id: forkedCardsetId,
      question: flashcard.question,
      answer: flashcard.answer,
    }))

    const { error: flashcardCreateError } = await supabase
      .from('flashcard')
      .insert(flashcardsToInsert)

    if (flashcardCreateError) {
      await supabase.from('cardset').delete().eq('id', forkedCardsetId)
      return { error: 'Failed to copy flashcards: ' + flashcardCreateError.message, status: 500 }
    }
  }

  const { error: relationError } = await supabase
    .from('card_user')
    .insert({
      user_email: requesterEmail,
      cardset_id: forkedCardsetId,
      role: 'owner',
    })

  if (relationError) {
    await supabase.from('cardset').delete().eq('id', forkedCardsetId)
    return { error: 'Failed to set ownership: ' + relationError.message, status: 400 }
  }

  return { cardset: createdCardset }
}
