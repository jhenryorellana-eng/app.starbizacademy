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

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', enrolled: false },
        { status: 400 }
      )
    }

    // Verify this session belongs to the current user
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }

    // Activate enrollment (fallback if webhook hasn't processed yet)
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('enrollments')
      .upsert(
        {
          profile_id: user.id,
          status: 'active',
          amount: 25.00,
          stripe_checkout_session_id: sessionId,
          stripe_payment_intent_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )

    return NextResponse.json({ success: true, enrolled: true })
  } catch (error) {
    console.error('Verify enrollment error:', error)
    return NextResponse.json(
      { error: 'Error verifying enrollment' },
      { status: 500 }
    )
  }
}
