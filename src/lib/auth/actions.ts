'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  whatsappNumber: z.string().optional(),
  country: z.string().min(1, 'Selecciona un país'),
  city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  parentCode: z.string().regex(/^P-\d{8}$/, 'Código de padre inválido'),
})

export type AuthState = {
  error?: string
  success?: boolean
}

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0].message }
  }

  const { email, password } = validatedFields.data

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/inicio')
}

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const validatedFields = registerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    whatsappNumber: formData.get('whatsappNumber'),
    country: formData.get('country'),
    city: formData.get('city'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0].message }
  }

  const { firstName, lastName, email, whatsappNumber, country, city, password } = validatedFields.data

  // Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'Este email ya está registrado' }
    }
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Error al crear la cuenta' }
  }

  // Create the profile using admin client (bypasses RLS)
  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      whatsapp_number: whatsappNumber || null,
      country,
      city,
      role: 'parent',
    })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return { error: 'Error al crear el perfil' }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding/plan')
}

export async function resetPassword(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Validar formato de campos
  const validatedFields = resetPasswordSchema.safeParse({
    email: formData.get('email'),
    parentCode: formData.get('parentCode'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0].message }
  }

  const { email, parentCode } = validatedFields.data

  // 2. Buscar el perfil por email
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, family_id')
    .eq('email', email)
    .single()

  if (!profile) {
    return { error: 'No se encontró una cuenta con este email' }
  }

  // 3. Verificar que el código de padre pertenece a la misma familia/perfil
  const { data: familyCode } = await adminClient
    .from('family_codes')
    .select('id, profile_id, family_id')
    .eq('code', parentCode)
    .eq('code_type', 'parent')
    .eq('status', 'active')
    .single()

  if (!familyCode) {
    return { error: 'Código de padre inválido o inactivo' }
  }

  // 4. Validar que coincidan (mismo perfil o misma familia)
  const isMatch = familyCode.profile_id === profile.id ||
                  familyCode.family_id === profile.family_id

  if (!isMatch) {
    return { error: 'El código de padre no corresponde a esta cuenta' }
  }

  // 5. Solo si todo coincide, enviar el email de recuperación
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/actualizar-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
