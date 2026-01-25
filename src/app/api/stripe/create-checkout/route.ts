import { NextRequest, NextResponse } from 'next/server'
import { stripe, buildLineItems, type BillingCycle } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/pricing/config'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { childrenCount, billingCycle } = body as {
      childrenCount: number
      billingCycle: BillingCycle
    }

    // Validate inputs
    if (!childrenCount || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields: childrenCount and billingCycle' },
        { status: 400 }
      )
    }

    if (childrenCount < PRICING.minChildren || childrenCount > PRICING.maxChildren) {
      return NextResponse.json(
        { error: `childrenCount must be between ${PRICING.minChildren} and ${PRICING.maxChildren}` },
        { status: 400 }
      )
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'billingCycle must be "monthly" or "yearly"' },
        { status: 400 }
      )
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

    // Build line items for Stripe
    const lineItems = buildLineItems(childrenCount, billingCycle)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: profile.email,
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/codigos?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/plan`,
      metadata: {
        userId: user.id,
        childrenCount: String(childrenCount),
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          childrenCount: String(childrenCount),
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    )
  }
}
