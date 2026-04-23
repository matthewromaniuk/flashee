//Session management utilities for storing and retrieving user session data in localStorage
const SESSION_KEY = 'flashee_session'
const USER_EMAIL_KEY = 'flashee_user_email'
const USER_ID_KEY = 'flashee_user_id'

export function getStoredSession() {
  return localStorage.getItem(SESSION_KEY)
}

export function getStoredUserContext() {
  return {
    userId: localStorage.getItem(USER_ID_KEY),
    userEmail: localStorage.getItem(USER_EMAIL_KEY),
  }
}

export function getStoredAuthHeaders() {
  const { userId, userEmail } = getStoredUserContext()
  return {
    'x-user-id': userId,
    'x-user-email': userEmail,
  }
}

export function setStoredSession({ session = null, user = null } = {}) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session ?? {}))

  if (user?.email) {
    localStorage.setItem(USER_EMAIL_KEY, user.email)
  }

  if (user?.id) {
    localStorage.setItem(USER_ID_KEY, user.id)
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  localStorage.removeItem(USER_ID_KEY)
}
