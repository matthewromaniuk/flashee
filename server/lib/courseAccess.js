import { supabase } from './supabaseClient.js'

export async function getCourseRole(courseId, userEmail) {
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
