import { supabase } from '../lib/supabaseClient.js'
import { generateInt64Id } from '../lib/int64Id.js'
import { canWrite, getRequesterEmail, isOwner } from '../lib/cardsetPermissions.js'

async function getCourseRole(courseId, userEmail) {
  const { data, error } = await supabase
    .from('course_user')
    .select('course_id, role')
    .eq('user_email', userEmail)

  if (error) {
    return { role: null, error }
  }

  const targetId = String(courseId)
  const match = (data ?? []).find((row) => {
    try {
      return BigInt(row.course_id) === BigInt(targetId)
    } catch {
      return String(row.course_id) === targetId
    }
  })

  return { role: match?.role ?? null, error: null }
}

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

export async function updateCourse(req, res) {
  const { id } = req.params
  const requesterEmail = getRequesterEmail(req)
  const payload = req.body ?? {}

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

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ error: 'Provide at least one editable field (name, description, isPublic)' })
  }

  const { data, error } = await supabase
    .from('course')
    .update(updatePayload)
    .eq('id', id)
    .select('*')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.status(200).json({ course: data[0] })
}

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

  const { data, error } = await supabase
    .from('course')
    .delete()
    .eq('id', id)
    .select('*')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.status(200).json({ message: 'Course deleted', course: data[0] })
}