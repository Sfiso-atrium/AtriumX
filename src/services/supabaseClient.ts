import { createClient } from '@supabase/supabase-js'

// Read from Vite env vars (see .env.example at project root — copy it to
// .env and fill in your project's values). The previous build had these
// credentials hardcoded directly in this file and committed to the repo,
// and also had a stray .env.txt sitting inside src/pages/ where Vite would
// never load it (Vite only reads .env files from the project root).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env at the project root and fill in your Supabase project values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'atriumx-auth',
  },
})
