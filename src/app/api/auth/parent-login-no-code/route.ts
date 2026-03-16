import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
})

/**
 * POST /api/auth/parent-login-no-code
 *
 * Login for parents who already have a membership but don't have
 * their code handy (e.g., after purchasing via IAP).
 * Automatically looks up the parent's code from family_codes.
 *
 * Returns same structure as /api/auth/parent-login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_001', message: result.error.errors[0].message },
        },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const normalizedEmail = email.toLowerCase().trim()
    const adminClient = createAdminClient()

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AUTH_001', message: 'Email o contrasena incorrectos' },
        },
        { status: 401 }
      )
    }

    // 2. Get parent profile
    const { data: parentProfile } = await adminClient
      .from('profiles')
      .select('id, family_id, first_name, last_name')
      .eq('id', authData.user.id)
      .single()

    if (!parentProfile?.family_id) {
      // User exists but has no family — needs to purchase membership
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEM_003', message: 'No tienes una membresia activa. Suscribete para continuar.' },
          needsPurchase: true,
        },
        { status: 403 }
      )
    }

    // 3. Get parent's family code
    const { data: familyCode } = await adminClient
      .from('family_codes')
      .select('code, status')
      .eq('family_id', parentProfile.family_id)
      .eq('code_type', 'parent')
      .eq('status', 'active')
      .single()

    if (!familyCode) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_002', message: 'Codigo de padre no encontrado' },
        },
        { status: 404 }
      )
    }

    // 4. Check active membership
    const { data: membership } = await adminClient
      .from('memberships')
      .select('id, status, current_period_end')
      .eq('family_id', parentProfile.family_id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEM_002', message: 'La membresia familiar no esta activa' },
        },
        { status: 403 }
      )
    }

    if (membership.current_period_end && new Date(membership.current_period_end) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEM_001', message: 'La membresia familiar ha expirado' },
        },
        { status: 402 }
      )
    }

    // 5. Get linked children
    const { data: childCodes } = await adminClient
      .from('family_codes')
      .select('id, code')
      .eq('family_id', parentProfile.family_id)
      .eq('code_type', 'child')
      .eq('status', 'active')

    const linkedChildren: Array<{ id: string; name: string; code: string }> = []

    if (childCodes && childCodes.length > 0) {
      for (const childCode of childCodes) {
        const { data: child } = await adminClient
          .from('children')
          .select('id, first_name, last_name')
          .eq('family_code_id', childCode.id)
          .single()

        if (child) {
          linkedChildren.push({
            id: child.id,
            name: `${child.first_name} ${child.last_name}`,
            code: childCode.code,
          })
        }
      }
    }

    // 6. Return full auth response
    const accessToken = authData.session?.access_token
    const refreshToken = authData.session?.refresh_token

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AUTH_001', message: 'Error al generar sesion' },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      user: {
        id: authData.user.id,
        email: normalizedEmail,
        firstName: parentProfile.first_name,
        lastName: parentProfile.last_name,
        fullName: `${parentProfile.first_name} ${parentProfile.last_name}`,
        code: familyCode.code,
        familyId: parentProfile.family_id,
        role: 'parent',
        linkedChildren,
        createdAt: authData.user.created_at,
      },
    })
  } catch (error) {
    console.error('Parent login no-code error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_001', message: 'Error interno del servidor' },
      },
      { status: 500 }
    )
  }
}
