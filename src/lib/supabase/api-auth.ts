import { NextRequest } from 'next/server'
import { createAdminClient } from './admin'
import { createClient } from './server'
import type { User } from '@supabase/supabase-js'

/**
 * Authenticates a request and returns the user.
 * Supports both Bearer token auth (mobile app) and cookie-based auth (web).
 *
 * Usage:
 *   const user = await getUserFromRequest(request)
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *
 * After calling this, use createAdminClient() for database queries
 * to ensure consistent behavior across both auth methods.
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  // 1. Try Bearer token auth (mobile app sends Authorization header)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const supabase = createAdminClient()
    const { data } = await supabase.auth.getUser(token)
    if (data?.user) return data.user
  }

  // 2. Fallback to cookie-based auth (web clients use Supabase SSR cookies)
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) return data.user
  } catch {
    // Cookie auth not available (e.g., API route context without cookies)
  }

  return null
}
