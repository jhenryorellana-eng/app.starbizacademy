import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function createBridgeToken(payload: Record<string, unknown>): string {
  const secret = process.env.STARBOOKS_BRIDGE_SECRET
  if (!secret) throw new Error('STARBOOKS_BRIDGE_SECRET not set')

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  })).toString('base64url')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url')

  return `${header}.${body}.${signature}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify active enrollment
    const adminSupabase = createAdminClient()
    const { data: enrollment } = await adminSupabase
      .from('enrollments')
      .select('status')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No tienes una inscripción activa. Paga tu inscripción primero.' },
        { status: 403 }
      )
    }

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Generate bridge token
    const token = createBridgeToken({
      sub: user.id,
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      enrollment_status: 'active',
    })

    const starbooksUrl = process.env.STARBOOKS_PWA_URL || 'http://localhost:3002'
    const redirectUrl = `${starbooksUrl}/auth/hub-callback?token=${token}`

    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('Starbooks access error:', error)
    return NextResponse.json(
      { error: 'Error generating access' },
      { status: 500 }
    )
  }
}
