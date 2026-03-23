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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user already has an active enrollment
    const adminSupabase = createAdminClient()
    const { data: existingEnrollment } = await adminSupabase
      .from('enrollments')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Ya tienes una inscripción activa' },
        { status: 400 }
      )
    }

    const enrollmentPriceId = process.env.STRIPE_PRICE_ENROLLMENT
    if (!enrollmentPriceId) {
      console.error('STRIPE_PRICE_ENROLLMENT is not set')
      return NextResponse.json(
        { error: 'Enrollment price not configured' },
        { status: 500 }
      )
    }

    // Create Stripe Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer_email: profile.email,
      line_items: [
        {
          price: enrollmentPriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/enrollment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/enrollment`,
      metadata: {
        userId: user.id,
        type: 'enrollment',
      },
    })

    // Create pending enrollment record
    await adminSupabase.from('enrollments').upsert(
      {
        profile_id: user.id,
        status: 'pending',
        amount: 25.00,
        stripe_checkout_session_id: session.id,
      },
      { onConflict: 'profile_id' }
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Enrollment checkout error:', error)
    return NextResponse.json(
      { error: 'Error creating enrollment checkout' },
      { status: 500 }
    )
  }
}
