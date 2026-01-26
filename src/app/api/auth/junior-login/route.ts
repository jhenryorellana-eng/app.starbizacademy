import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidFamilyCode, getCodeType } from '@/lib/codes/generator'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
  code: z.string().min(1, 'Codigo requerido'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Validar campos de entrada
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_001',
            message: result.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { email, password, code } = result.data
    const normalizedCode = code.toUpperCase()
    const normalizedEmail = email.toLowerCase().trim()

    // 2. Validar formato del código
    if (!isValidFamilyCode(normalizedCode)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_001', message: 'Formato de codigo invalido' },
        },
        { status: 400 }
      )
    }

    // 3. Verificar que sea código de estudiante (E-XXXXXXXX)
    const codeType = getCodeType(normalizedCode)
    if (codeType !== 'child') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_003', message: 'Este codigo no es de estudiante' },
        },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // 4. Autenticar credenciales del padre con Supabase
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

    // 5. Obtener el perfil del padre para saber su family_id
    const { data: parentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, family_id, first_name, last_name')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !parentProfile?.family_id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AUTH_001', message: 'Perfil no encontrado' },
        },
        { status: 401 }
      )
    }

    // 6. Buscar el código de estudiante en la base de datos
    const { data: familyCode, error: codeError } = await adminClient
      .from('family_codes')
      .select('id, code, code_type, family_id, status')
      .eq('code', normalizedCode)
      .single()

    if (codeError || !familyCode) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_002', message: 'Codigo no encontrado' },
        },
        { status: 404 }
      )
    }

    // 7. Verificar que el código pertenezca a la misma familia del padre
    if (familyCode.family_id !== parentProfile.family_id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_005', message: 'Este codigo no pertenece a tu familia' },
        },
        { status: 403 }
      )
    }

    // 8. Verificar estado del código
    if (familyCode.status === 'revoked') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_004', message: 'Este codigo ha sido revocado' },
        },
        { status: 403 }
      )
    }

    if (familyCode.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_004', message: 'Este codigo no esta activo' },
        },
        { status: 403 }
      )
    }

    // 9. Buscar datos del hijo asociado al código
    const { data: child, error: childError } = await adminClient
      .from('children')
      .select('id, first_name, last_name, birth_date, created_at')
      .eq('family_code_id', familyCode.id)
      .single()

    if (childError || !child) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CODE_005', message: 'No se encontro el perfil del estudiante' },
        },
        { status: 404 }
      )
    }

    // 10. Verificar membresía familiar activa
    const { data: membership, error: membershipError } = await adminClient
      .from('memberships')
      .select('id, status, current_period_end')
      .eq('family_id', parentProfile.family_id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEM_002', message: 'La membresia familiar no esta activa' },
        },
        { status: 403 }
      )
    }

    // Verificar que no haya expirado
    if (membership.current_period_end && new Date(membership.current_period_end) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MEM_001', message: 'La membresia familiar ha expirado' },
        },
        { status: 402 }
      )
    }

    // 11. Usar la sesión de Supabase como tokens
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

    // 12. Retornar respuesta exitosa
    return NextResponse.json({
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      user: {
        id: child.id,
        email: normalizedEmail, // Email del padre (para referencia)
        firstName: child.first_name,
        lastName: child.last_name,
        fullName: `${child.first_name} ${child.last_name}`,
        dateOfBirth: child.birth_date,
        code: normalizedCode,
        familyId: parentProfile.family_id,
        createdAt: child.created_at,
      },
    })

  } catch (error) {
    console.error('Junior login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_001',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    )
  }
}
