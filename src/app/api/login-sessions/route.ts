import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/login-sessions
 * Records a new login session for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const {
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      city,
      country,
      latitude,
      longitude,
      userAgent,
    } = body

    // Insert login session
    const { data, error } = await supabase
      .from('login_sessions')
      .insert({
        profile_id: user.id,
        browser_name: browserName || null,
        browser_version: browserVersion || null,
        os_name: osName || null,
        os_version: osVersion || null,
        device_type: deviceType || null,
        city: city || null,
        country: country || null,
        latitude: latitude || null,
        longitude: longitude || null,
        user_agent: userAgent || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting login session:', error)
      return NextResponse.json({ error: 'Error al registrar sesión' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Login session error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * GET /api/login-sessions
 * Retrieves the last 10 login sessions for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch last 10 sessions
    const { data, error } = await supabase
      .from('login_sessions')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching login sessions:', error)
      return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Login sessions fetch error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
