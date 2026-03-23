import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'

export async function POST() {
  try {
    const enrollmentPriceId = process.env.STRIPE_PRICE_ENROLLMENT
    if (!enrollmentPriceId) {
      return NextResponse.json(
        { error: 'Enrollment price not configured' },
        { status: 500 }
      )
    }

    // Create Stripe Checkout Session WITHOUT requiring auth
    // Stripe will collect the email in the checkout form
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: enrollmentPriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/registro?paid=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: {
        type: 'enrollment',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Guest enrollment checkout error:', error)
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    )
  }
}
