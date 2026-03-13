import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

let client: SupabaseClient | undefined

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
