import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Guest mode (IndexedDB) still works without them.',
  )
}

// createClient throws synchronously on an empty URL, which would crash the
// whole app (including guest mode) before React ever renders -- fall back to
// a syntactically valid placeholder so a misconfigured deploy just leaves
// Supabase calls failing (caught by the existing offline-fallback paths in
// useApplications/useTrackers) instead of taking down the entire page.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
