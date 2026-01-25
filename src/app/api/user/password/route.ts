import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'La contraseña actual es requerida' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json({ error: 'Error al actualizar la contraseña' }, { status: 500 })
    }

    // Create notification for password change
    const adminClient = createAdminClient()
    await adminClient.from('notifications').insert({
      profile_id: user.id,
      type: 'password_changed',
      title: 'Contraseña actualizada',
      message: 'Tu contraseña ha sido cambiada exitosamente. Si no realizaste este cambio, contacta soporte inmediatamente.',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in password route:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
