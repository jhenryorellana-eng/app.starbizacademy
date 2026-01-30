import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)

    const body = await request.json()
    const { mini_app_id, child_id } = body

    if (!mini_app_id) {
      return NextResponse.json({ error: 'mini_app_id required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 2. Validate token and get user
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 3. Generate random code (8 chars)
    const code = randomBytes(4).toString('hex').toUpperCase()

    // 4. Save code with 60 second expiry
    const expiresAt = new Date(Date.now() + 60 * 1000)

    const { error: insertError } = await adminClient
      .from('mini_app_codes')
      .insert({
        code,
        user_id: user.id,
        child_id: child_id || null,
        mini_app_id,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Error creating mini app code:', insertError)
      return NextResponse.json({ error: 'Failed to create code' }, { status: 500 })
    }

    return NextResponse.json({
      code,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Mini app code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
