import { supabase } from '../lib/supabaseClient.js'

const MIN_PASSWORD_LENGTH = 8

//Helper function to build sign-up options, including email redirect and user metadata
function buildSignUpOptions(fullName) {
  const options = {}
  const redirectUrl = process.env.SUPABASE_CONFIRM_URL
  if (redirectUrl) {
    options.emailRedirectTo = redirectUrl
  }

  const metadata = {}
  if (fullName) {
    metadata.full_name = fullName
  }
  if (Object.keys(metadata).length > 0) {
    options.data = metadata
  }

  return options
}

//Sign-up handler, validates input and creates a new user in Supabase Auth
export function createSignUpHandler(client = supabase) {
  return async function signUp(req, res) {
    const { email, password, fullName } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: buildSignUpOptions(fullName),
      })

      if (error) {
        return res.status(400).json({ error: error.message, hint: error.hint })
      }

      return res.status(201).json({
        message: data?.user ? 'Sign-up successful, check your inbox' : 'Sign-up completed',
        user: data?.user
          ? {
              id: data.user.id,
              email: data.user.email,
              created_at: data.user?.created_at,
            }
          : null,
        session: data?.session ?? null,
      })
    } catch (err) {
      console.error('Sign-up failed', err)
      return res.status(500).json({ error: 'An unexpected error occurred during sign-up' })
    }
  }
}

export const signUp = createSignUpHandler()

//create sign-in handler, validates input and authenticates user with Supabase Auth
export function createSignInHandler(client = supabase) {
  return async function signIn(req, res) {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return res.status(401).json({ error: error.message })
      }

      return res.status(200).json({
        message: 'Sign-in successful',
        user: data?.user
          ? {
              id: data.user.id,
              email: data.user.email,
              created_at: data.user?.created_at,
            }
          : null,
        session: data?.session ?? null,
      })
    } catch (err) {
      console.error('Sign-in failed', err)
      return res.status(500).json({ error: 'An unexpected error occurred during sign-in' })
    }
  }
}

export const signIn = createSignInHandler()
