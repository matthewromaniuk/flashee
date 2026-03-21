import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Always load environment variables from repository root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in root .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
})
