import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createFamilyAndMembership } from '@/lib/stripe/family-setup'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Verify the session belongs to this user
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    // Check if user already has family
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (profile?.family_id) {
      // Family already exists, return success
      return NextResponse.json({ success: true, familyId: profile.family_id })
    }

    // Create family (same logic as webhook)
    if (!session.subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const childrenCount = Number(session.metadata?.childrenCount) || 1

    const familyId = await createFamilyAndMembership(user.id, subscription, childrenCount)

    return NextResponse.json({ success: true, familyId })
  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error verifying session' },
      { status: 500 }
    )
  }
}
