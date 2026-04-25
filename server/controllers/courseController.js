//Controller for course-related endpoints, handling CRUD operations and access control based on user roles
import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { canWrite, getRequesterEmail, isOwner } from '../lib/deckPermissions.js'
import { getCourseRole } from '../lib/courseAccess.js'

//Fetch courses that the user has access to, along with their roles
export async function getCoursesByUserId(req, res) {
  const { userId } = req.params
  const requesterUserId = req.headers['x-user-id']
  const requesterEmail = getRequesterEmail(req)

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Path parameter "userId" is required' })
  }

  if (!requesterEmail) {
    return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
  }

  if (typeof requesterUserId === 'string' && requesterUserId && requesterUserId !== userId) {
    return res.status(403).json({ error: 'User id mismatch' })
  }

  const { data, error } = await supabase
    .from('course_user')
    .select('role, course:course_id(*)')
    .eq('user_email', requesterEmail)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const courses = (data ?? [])
    .filter((entry) => entry.course)
    .map((entry) => ({ ...entry.course, role: entry.role }))

  return res.status(200).json({ courses })
}

//Fetch public courses that anyone can access, without requiring authentication
export async function getPublicCourses(req, res) {
  const { data, error } = await supabase
    .from('course')
    .select('*')
    .eq('isPublic', true)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ courses: data ?? [] })
}

//Create Course for User
export async function createCourse(req, res) {
  const payload = req.body ?? {}
  const requesterEmail = getRequesterEmail(req)
  const courseId = generateInt64Id()
  const normalizedDescription = typeof payload.description === 'string'
    ? payload.description
    : ''

  if (!requesterEmail) {
    return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
  }

  if (!payload.name || typeof payload.name !== 'string') {
    return res.status(400).json({ error: 'Field "name" is required' })
  }

  if (typeof payload.isPublic !== 'boolean') {
    return res.status(400).json({ error: 'Field "isPublic" is required and must be boolean' })
  }

  const insertPayload = {
    id: courseId,
    name: payload.name,
    description: normalizedDescription,
    isPublic: payload.isPublic,
  }

  const { data, error } = await supabase
    .from('course')
    .insert(insertPayload)
    .select('*')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const createdCourse = data?.[0]
  if (!createdCourse) {
    return res.status(500).json({ error: 'Course created but id missing in response' })
  }

  const { error: relationError } = await supabase
    .from('course_user')
    .insert({
      course_id: courseId,
      user_email: requesterEmail,
      role: 'owner',
    })

  if (relationError) {
    await supabase.from('course').delete().eq('id', courseId)
    return res.status(400).json({ error: relationError.message })
  }

  return res.status(201).json({ course: { ...createdCourse, id: courseId } })
}

//Update course details, check permissions
export async function updateCourse(req, res) {
  const { id } = req.params
  const requesterEmail = getRequesterEmail(req)
  const payload = req.body ?? {}
  const removeDeckIds = Array.isArray(payload.removeDeckIds)
    ? [...new Set(payload.removeDeckIds.map((deckId) => String(deckId)).filter(Boolean))]
    : []

  if (!id) {
    return res.status(400).json({ error: 'Path parameter "id" is required' })
  }

  if (!requesterEmail) {
    return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
  }

  const { role, error: roleError } = await getCourseRole(id, requesterEmail)
  if (roleError) {
    return res.status(500).json({ error: roleError.message })
  }

  if (!canWrite(role)) {
    return res.status(403).json({ error: 'Insufficient role for this course' })
  }

  const updatePayload = {}
  if (typeof payload.name === 'string') {
    updatePayload.name = payload.name
  }
  if (typeof payload.description === 'string') {
    updatePayload.description = payload.description
  }
  if (typeof payload.isPublic === 'boolean') {
    updatePayload.isPublic = payload.isPublic
  }

  const deckIdsToDetach = removeDeckIds.length > 0
    ? removeDeckIds
    : []

  if (Object.keys(updatePayload).length === 0 && deckIdsToDetach.length === 0) {
    return res.status(400).json({ error: 'Provide at least one editable field (name, description, isPublic) or removeDeckIds' })
  }

  let detachedDecks = []
  if (deckIdsToDetach.length > 0) {
    const { data: decks, error: detachFetchError } = await supabase
      .from('deck')
      .select('id')
      .eq('course_id', id)
      .in('id', deckIdsToDetach)

    if (detachFetchError) {
      return res.status(400).json({ error: detachFetchError.message })
    }

    detachedDecks = decks ?? []

    const { error: detachError } = await supabase
      .from('deck')
      .update({ course_id: null })
      .eq('course_id', id)
      .in('id', deckIdsToDetach)

    if (detachError) {
      return res.status(400).json({ error: detachError.message })
    }
  }

  let courseData = null

  if (Object.keys(updatePayload).length > 0) {
    const { data, error } = await supabase
      .from('course')
      .update(updatePayload)
      .eq('id', id)
      .select('*')

    if (error) {
      if (detachedDecks.length > 0) {
        const restoreIds = detachedDecks.map((deck) => deck.id)
        await supabase
          .from('deck')
          .update({ course_id: id })
          .in('id', restoreIds)
      }
      return res.status(400).json({ error: error.message })
    }

    courseData = data
  } else {
    const { data, error } = await supabase
      .from('course')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Course not found' })
    }

    courseData = [data]
  }

  if (!courseData || courseData.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.status(200).json({ course: courseData[0] })
}

//Delete course, only owner can delete
export async function deleteCourse(req, res) {
  const { id } = req.params
  const requesterEmail = getRequesterEmail(req)

  if (!id) {
    return res.status(400).json({ error: 'Path parameter "id" is required' })
  }

  if (!requesterEmail) {
    return res.status(400).json({ error: 'Requester email is required (x-user-email header, query email, or body user_email)' })
  }

  const { role, error: roleError } = await getCourseRole(id, requesterEmail)
  if (roleError) {
    return res.status(500).json({ error: roleError.message })
  }

  if (!isOwner(role)) {
    return res.status(403).json({ error: 'Only owners can delete courses' })
  }

  const { data: decksToDetach, error: fetchDeckError } = await supabase
    .from('deck')
    .select('id')
    .eq('course_id', id)

  if (fetchDeckError) {
    return res.status(400).json({ error: fetchDeckError.message })
  }

  const { error: detachError } = await supabase
    .from('deck')
    .update({ course_id: null })
    .eq('course_id', id)

  if (detachError) {
    return res.status(400).json({ error: detachError.message })
  }

  const { data, error } = await supabase
    .from('course')
    .delete()
    .eq('id', id)
    .select('*')

  if (error) {
    const deckIds = (decksToDetach ?? []).map((deck) => deck.id)
    if (deckIds.length > 0) {
      await supabase
        .from('deck')
        .update({ course_id: id })
        .in('id', deckIds)
    }
    return res.status(400).json({ error: error.message })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.status(200).json({ message: 'Course deleted', course: data[0] })
}
