import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()
    const adminSupabase = createAdminClient()

    // Check if user already has active enrollment
    const { data: existingEnrollment } = await adminSupabase
      .from('enrollments')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ success: true, enrolled: true })
    }

    // Get user's email for fallback search
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    let paidSession = null

    // Strategy 1: Verify by session_id (if provided)
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (
          session.payment_status === 'paid' &&
          session.metadata?.type === 'enrollment'
        ) {
          paidSession = session
        }
      } catch {
        // Session not found, try fallback
      }
    }

    // Strategy 2: Search Stripe by email (fallback for closed browser)
    if (!paidSession && profile?.email) {
      const sessions = await stripe.checkout.sessions.list({
        customer_details: { email: profile.email },
        limit: 10,
      })

      paidSession = sessions.data.find(
        (s) =>
          s.payment_status === 'paid' &&
          s.metadata?.type === 'enrollment'
      ) || null
    }

    if (!paidSession) {
      return NextResponse.json({ success: false, enrolled: false })
    }

    // Create enrollment
    await adminSupabase.from('enrollments').upsert(
      {
        profile_id: user.id,
        status: 'active',
        amount: 25.00,
        stripe_checkout_session_id: paidSession.id,
        stripe_payment_intent_id: paidSession.payment_intent as string,
        paid_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    )

    return NextResponse.json({ success: true, enrolled: true })
  } catch (error) {
    console.error('Link enrollment error:', error)
    return NextResponse.json(
      { error: 'Error linking enrollment' },
      { status: 500 }
    )
  }
}
