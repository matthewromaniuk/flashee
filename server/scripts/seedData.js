import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'

const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'romaniukmatthew@gmail.com'
const COURSES_TO_CREATE = Number.parseInt(process.env.SEED_COURSE_COUNT || '8', 10)
const DECKS_PER_COURSE = Number.parseInt(process.env.SEED_DECKS_PER_COURSE || '4', 10)
const FLASHCARDS_PER_DECK = Number.parseInt(process.env.SEED_FLASHCARDS_PER_DECK || '6', 10)
const EXTRA_PUBLIC_DECKS = Number.parseInt(process.env.SEED_EXTRA_PUBLIC_DECKS || '6', 10)

const courseTopics = [
  'Biology',
  'Chemistry',
  'Physics',
  'World History',
  'Computer Science',
  'Algebra',
  'Psychology',
  'Economics',
  'Philosophy',
  'Anatomy',
  'Neuroscience',
  'Data Structures',
]

const modifiers = [
  '101',
  'Advanced',
  'Crash Course',
  'Exam Prep',
  'Foundations',
  'Deep Dive',
  'Mastery',
  'Quick Review',
  'Weekly Practice',
  'Midterm Focus',
]

const deckPrefixes = [
  'Chapter',
  'Module',
  'Unit',
  'Quiz Pack',
  'Final Review',
  'Concept Drill',
  'Case Study',
  'Lab Notes',
  'Term Builder',
]

function pick(list, index) {
  return list[index % list.length]
}

function buildCourseName(index) {
  return `${pick(courseTopics, index)} ${pick(modifiers, index + 3)}`
}

function buildDeckName(courseName, deckIndex) {
  return `${pick(deckPrefixes, deckIndex)} ${deckIndex + 1}: ${courseName}`
}

function buildQuestion(courseName, deckName, questionIndex) {
  return `${courseName} :: ${deckName} :: concept ${questionIndex + 1}?`
}

function buildAnswer(courseName, deckName, questionIndex) {
  return `Reference answer ${questionIndex + 1} for ${courseName} in ${deckName}.`
}

async function cleanupSeededData(userEmail) {
  const { data: courseLinks, error: courseLinkError } = await supabase
    .from('course_user')
    .select('course_id')
    .eq('user_email', userEmail)

  if (courseLinkError) {
    throw new Error(`Failed to read existing course links: ${courseLinkError.message}`)
  }

  const { data: deckLinks, error: deckLinkError } = await supabase
    .from('card_user')
    .select('cardset_id')
    .eq('user_email', userEmail)

  if (deckLinkError) {
    throw new Error(`Failed to read existing deck links: ${deckLinkError.message}`)
  }

  const courseIds = [...new Set((courseLinks ?? []).map((row) => String(row.course_id)))]
  const cardsetIds = [...new Set((deckLinks ?? []).map((row) => String(row.cardset_id)))]

  if (cardsetIds.length > 0) {
    const { error: flashcardStatusDeleteError } = await supabase
      .from('flashcard_status')
      .delete()
      .in('cardset_id', cardsetIds)

    if (flashcardStatusDeleteError) {
      throw new Error(`Failed to delete existing flashcard status rows: ${flashcardStatusDeleteError.message}`)
    }

    const { error: flashcardDeleteError } = await supabase
      .from('flashcard')
      .delete()
      .in('cardset_id', cardsetIds)

    if (flashcardDeleteError) {
      throw new Error(`Failed to delete existing flashcards: ${flashcardDeleteError.message}`)
    }

    const { error: cardUserDeleteError } = await supabase
      .from('card_user')
      .delete()
      .eq('user_email', userEmail)

    if (cardUserDeleteError) {
      throw new Error(`Failed to delete existing card_user links: ${cardUserDeleteError.message}`)
    }

    const { error: cardsetDeleteError } = await supabase
      .from('cardset')
      .delete()
      .in('id', cardsetIds)

    if (cardsetDeleteError) {
      throw new Error(`Failed to delete existing cardsets: ${cardsetDeleteError.message}`)
    }
  }

  if (courseIds.length > 0) {
    const { error: courseUserDeleteError } = await supabase
      .from('course_user')
      .delete()
      .eq('user_email', userEmail)

    if (courseUserDeleteError) {
      throw new Error(`Failed to delete existing course_user links: ${courseUserDeleteError.message}`)
    }

    const { error: courseDeleteError } = await supabase
      .from('course')
      .delete()
      .in('id', courseIds)

    if (courseDeleteError) {
      throw new Error(`Failed to delete existing courses: ${courseDeleteError.message}`)
    }
  }
}

async function seed() {
  console.log(`[seed] Seeding data for ${SEED_USER_EMAIL}`)
  await cleanupSeededData(SEED_USER_EMAIL)

  const courses = []
  const courseUserRows = []
  const cardsets = []
  const cardUserRows = []
  const flashcards = []

  for (let i = 0; i < COURSES_TO_CREATE; i += 1) {
    const courseId = generateInt64Id()
    const courseName = buildCourseName(i)

    courses.push({
      id: courseId,
      name: courseName,
      description: `Seeded public course ${i + 1} for search tests: ${courseName}`,
      isPublic: true,
    })

    courseUserRows.push({
      course_id: courseId,
      user_email: SEED_USER_EMAIL,
      role: 'owner',
    })

    for (let j = 0; j < DECKS_PER_COURSE; j += 1) {
      const cardsetId = generateInt64Id()
      const deckName = buildDeckName(courseName, j)

      cardsets.push({
        id: cardsetId,
        name: deckName,
        isPublic: true,
        course_id: courseId,
      })

      cardUserRows.push({
        user_email: SEED_USER_EMAIL,
        cardset_id: cardsetId,
        role: 'owner',
      })

      for (let k = 0; k < FLASHCARDS_PER_DECK; k += 1) {
        flashcards.push({
          id: generateInt64Id(),
          cardset_id: cardsetId,
          question: buildQuestion(courseName, deckName, k),
          answer: buildAnswer(courseName, deckName, k),
        })
      }
    }
  }

  for (let i = 0; i < EXTRA_PUBLIC_DECKS; i += 1) {
    const cardsetId = generateInt64Id()
    const deckName = `Public Search Sampler ${i + 1} - ${pick(courseTopics, i + 5)}`

    cardsets.push({
      id: cardsetId,
      name: deckName,
      isPublic: true,
      course_id: null,
    })

    cardUserRows.push({
      user_email: SEED_USER_EMAIL,
      cardset_id: cardsetId,
      role: 'owner',
    })

    for (let k = 0; k < FLASHCARDS_PER_DECK; k += 1) {
      flashcards.push({
        id: generateInt64Id(),
        cardset_id: cardsetId,
        question: `${deckName} :: keyword probe ${k + 1}?`,
        answer: `Sample answer ${k + 1} for ${deckName}.`,
      })
    }
  }

  const { error: courseInsertError } = await supabase.from('course').insert(courses)
  if (courseInsertError) {
    throw new Error(`Failed to insert courses: ${courseInsertError.message}`)
  }

  const { error: courseUserInsertError } = await supabase.from('course_user').insert(courseUserRows)
  if (courseUserInsertError) {
    throw new Error(`Failed to insert course_user rows: ${courseUserInsertError.message}`)
  }

  const { error: cardsetInsertError } = await supabase.from('cardset').insert(cardsets)
  if (cardsetInsertError) {
    throw new Error(`Failed to insert cardsets: ${cardsetInsertError.message}`)
  }

  const { error: cardUserInsertError } = await supabase.from('card_user').insert(cardUserRows)
  if (cardUserInsertError) {
    throw new Error(`Failed to insert card_user rows: ${cardUserInsertError.message}`)
  }

  const { error: flashcardInsertError } = await supabase.from('flashcard').insert(flashcards)
  if (flashcardInsertError) {
    throw new Error(`Failed to insert flashcards: ${flashcardInsertError.message}`)
  }

  console.log(`[seed] Done. Inserted ${courses.length} courses, ${cardsets.length} decks, ${flashcards.length} flashcards.`)
}

seed()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('[seed] Failed:', error.message)
    process.exit(1)
  })
