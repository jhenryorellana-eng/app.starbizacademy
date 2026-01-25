import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Admin client with service role key for server-side operations
// Only use this in API routes and server actions
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
