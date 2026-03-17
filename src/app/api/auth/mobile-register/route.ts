import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/resend/emails'
import { z } from 'zod'
import type { InsertTables } from '@/types/database.types'

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  whatsappNumber: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  password: z.string().min(8),
})

/**
 * POST /api/auth/mobile-register
 *
 * Registers a new parent account from the mobile app.
 * Unlike the web register endpoint, this returns auth tokens
 * so the user can immediately proceed to the onboarding/purchase flow.
 *
 * The user is created WITHOUT a family_id — that gets assigned
 * after completing the IAP purchase via the RevenueCat webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validatedFields = registerSchema.safeParse(body)
    if (!validatedFields.success) {
      return NextResponse.json(
        { error: validatedFields.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, whatsappNumber, country, city, password } = validatedFields.data
    const adminClient = createAdminClient()

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (authError) {
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        return NextResponse.json(
          { error: 'Este email ya está registrado' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
    }

    // 2. Create profile (bypasses RLS with admin client)
    const profileData: InsertTables<'profiles'> = {
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      whatsapp_number: whatsappNumber || null,
      country: country || null,
      city: city || null,
      role: 'parent',
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert(profileData as never)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: 'Error al crear el perfil' }, { status: 500 })
    }

    // 3. Sign in to get session tokens
    const { data: sessionData, error: signInError } = await adminClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !sessionData.session) {
      console.error('Sign in after register error:', signInError)
      return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
    }

    // 4. Send welcome email (fire-and-forget)
    sendWelcomeEmail({ to: email, firstName }).catch(console.error)

    // 5. Return tokens + basic user info
    return NextResponse.json({
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      user: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
      },
    })
  } catch (error) {
    console.error('Mobile registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
