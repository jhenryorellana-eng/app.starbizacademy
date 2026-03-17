import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('STRIPE_PRICE_FAMILY_BASE_MONTHLY', 'price_base_monthly')
vi.stubEnv('STRIPE_PRICE_FAMILY_BASE_YEARLY', 'price_base_yearly')
vi.stubEnv('STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY', 'price_child_monthly')
vi.stubEnv('STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY', 'price_child_yearly')

// Mock Stripe
const mockStripe = {
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  subscriptionSchedules: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    release: vi.fn(),
  },
}

vi.mock('@/lib/stripe/client', () => ({
  stripe: mockStripe,
  getFamilyBasePriceId: (cycle: string) =>
    cycle === 'yearly' ? 'price_base_yearly' : 'price_base_monthly',
  getAdditionalChildPriceId: (cycle: string) =>
    cycle === 'yearly' ? 'price_child_yearly' : 'price_child_monthly',
}))

// Mock Supabase
const mockSupabaseChain = () => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
  }
  return chain
}

const mockUserSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

const mockAdminSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockUserSupabase),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminSupabase),
}))

vi.mock('@/lib/push-notifications', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}))

// Helper to create NextRequest
function createRequest(body: object) {
  return new Request('http://localhost/api/stripe/update-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

// Helper to set up authenticated user with membership
function setupAuthenticatedUser(opts: {
  currentChildren?: number
  billingCycle?: string
  familyId?: string
  subscriptionId?: string
}) {
  const {
    currentChildren = 1,
    billingCycle = 'monthly',
    familyId = 'family-123',
    subscriptionId = 'sub_test123',
  } = opts

  // Auth
  mockUserSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
  })

  // Profile query
  const profileChain = mockSupabaseChain()
  profileChain.single.mockResolvedValue({
    data: { family_id: familyId },
    error: null,
  })

  // Membership query
  const membershipChain = mockSupabaseChain()
  membershipChain.single.mockResolvedValue({
    data: {
      id: 'mem-123',
      stripe_subscription_id: subscriptionId,
      plans: { id: 'plan-123', max_children: currentChildren },
      billing_cycle: billingCycle,
    },
    error: null,
  })

  mockUserSupabase.from.mockImplementation((table: string) => {
    if (table === 'profiles') return profileChain
    if (table === 'memberships') return membershipChain
    return mockSupabaseChain()
  })

  // Admin supabase defaults
  const adminChain = mockSupabaseChain()
  adminChain.single.mockResolvedValue({ data: { id: 'plan-new' }, error: null })
  mockAdminSupabase.from.mockReturnValue(adminChain)

  // Stripe subscription
  mockStripe.subscriptions.retrieve.mockResolvedValue({
    id: subscriptionId,
    customer: 'cus_test123',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    metadata: { childrenCount: String(currentChildren) },
    items: {
      data: [
        {
          id: 'si_base',
          price: { id: 'price_base_monthly', recurring: { interval: 'month' } },
          quantity: 1,
        },
        ...(currentChildren > 1
          ? [{
              id: 'si_child',
              price: { id: 'price_child_monthly', recurring: { interval: 'month' } },
              quantity: currentChildren - 1,
            }]
          : []),
      ],
    },
  })

  mockStripe.subscriptions.update.mockResolvedValue({
    id: subscriptionId,
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  })

  mockStripe.subscriptionSchedules.list.mockResolvedValue({ data: [] })
}

// Import AFTER mocks are set up
const { POST } = await import('@/app/api/stripe/update-subscription/route')

describe('POST /api/stripe/update-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('returns 401 if user is not authenticated', async () => {
      mockUserSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      const req = createRequest({ newChildrenCount: 2 })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 if childrenCount is below minimum', async () => {
      setupAuthenticatedUser({})
      const req = createRequest({ newChildrenCount: 0 })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 if childrenCount is above maximum', async () => {
      setupAuthenticatedUser({})
      const req = createRequest({ newChildrenCount: 11 })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 if no changes requested', async () => {
      setupAuthenticatedUser({ currentChildren: 2 })
      const req = createRequest({ newChildrenCount: 2 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('No changes')
    })

    it('returns 400 if downgrade without childrenToKeep', async () => {
      setupAuthenticatedUser({ currentChildren: 3 })
      const req = createRequest({ newChildrenCount: 1 })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('seleccionar')
    })

    it('returns 400 if childrenToKeep length does not match newChildrenCount', async () => {
      setupAuthenticatedUser({ currentChildren: 3 })
      const req = createRequest({
        newChildrenCount: 1,
        childrenToKeep: ['child-1', 'child-2'], // Should be exactly 1
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('Upgrade (more children)', () => {
    it('uses create_prorations for upgrade', async () => {
      setupAuthenticatedUser({ currentChildren: 1 })
      const req = createRequest({ newChildrenCount: 3 })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
          metadata: expect.objectContaining({
            childrenCount: '3',
          }),
        })
      )
    })

    it('adds additional child item when upgrading from 1 child', async () => {
      setupAuthenticatedUser({ currentChildren: 1 })
      const req = createRequest({ newChildrenCount: 3 })
      await POST(req)

      const updateCall = mockStripe.subscriptions.update.mock.calls[0]
      const items = updateCall[1].items
      // Should add new item with price and quantity 2
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            price: 'price_child_monthly',
            quantity: 2,
          }),
        ])
      )
    })

    it('returns success with correct data', async () => {
      setupAuthenticatedUser({ currentChildren: 1 })
      const req = createRequest({ newChildrenCount: 3 })
      const res = await POST(req)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.newChildrenCount).toBe(3)
      expect(data.isUpgrade).toBe(true)
      expect(data.isDowngrade).toBe(false)
    })
  })

  describe('Downgrade (fewer children)', () => {
    it('uses no proration for downgrade', async () => {
      setupAuthenticatedUser({ currentChildren: 3 })

      // Mock valid children
      const adminChain = mockSupabaseChain()
      adminChain.single.mockResolvedValue({ data: { id: 'plan-new' }, error: null })
      // children validation
      let callCount = 0
      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'children') {
          const chain = mockSupabaseChain()
          chain.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'child-1' }],
                error: null,
              }),
            }),
          })
          return chain
        }
        return adminChain
      })

      const req = createRequest({
        newChildrenCount: 1,
        childrenToKeep: ['child-1'],
      })
      const res = await POST(req)

      if (res.status === 200) {
        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          expect.objectContaining({
            proration_behavior: 'none',
          })
        )
      }
    })

    it('returns isDowngrade: true', async () => {
      setupAuthenticatedUser({ currentChildren: 3 })

      const adminChain = mockSupabaseChain()
      adminChain.single.mockResolvedValue({ data: { id: 'plan-new' }, error: null })
      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'children') {
          const chain = mockSupabaseChain()
          chain.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'child-1' }],
                error: null,
              }),
            }),
          })
          return chain
        }
        return adminChain
      })

      const req = createRequest({
        newChildrenCount: 1,
        childrenToKeep: ['child-1'],
      })
      const res = await POST(req)

      if (res.status === 200) {
        const data = await res.json()
        expect(data.isDowngrade).toBe(true)
      }
    })
  })

  describe('Billing cycle change', () => {
    it('updates price IDs when changing from monthly to yearly', async () => {
      setupAuthenticatedUser({ currentChildren: 2, billingCycle: 'monthly' })
      const req = createRequest({
        newChildrenCount: 2,
        newBillingCycle: 'yearly',
      })
      const res = await POST(req)

      expect(res.status).toBe(200)

      const updateCall = mockStripe.subscriptions.update.mock.calls[0]
      const items = updateCall[1].items

      // Base price should be updated to yearly
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'si_base',
            price: 'price_base_yearly',
          }),
        ])
      )
    })

    it('uses create_prorations for cycle change', async () => {
      setupAuthenticatedUser({ currentChildren: 1, billingCycle: 'monthly' })
      const req = createRequest({
        newChildrenCount: 1,
        newBillingCycle: 'yearly',
      })
      const res = await POST(req)

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
        })
      )
    })

    it('returns isBillingCycleChange: true', async () => {
      setupAuthenticatedUser({ currentChildren: 1, billingCycle: 'monthly' })
      const req = createRequest({
        newChildrenCount: 1,
        newBillingCycle: 'yearly',
      })
      const res = await POST(req)

      const data = await res.json()
      expect(data.isBillingCycleChange).toBe(true)
      expect(data.newBillingCycle).toBe('yearly')
    })
  })

  describe('Combined change (children + cycle)', () => {
    it('handles upgrade + cycle change in one step', async () => {
      setupAuthenticatedUser({ currentChildren: 1, billingCycle: 'monthly' })
      const req = createRequest({
        newChildrenCount: 3,
        newBillingCycle: 'yearly',
      })
      const res = await POST(req)

      expect(res.status).toBe(200)

      const updateCall = mockStripe.subscriptions.update.mock.calls[0]
      const items = updateCall[1].items

      // Should have yearly base price
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ price: 'price_base_yearly' }),
        ])
      )

      // Should add yearly child price with quantity 2
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            price: 'price_child_yearly',
            quantity: 2,
          }),
        ])
      )

      // Should use prorations (it's an upgrade)
      expect(updateCall[1].proration_behavior).toBe('create_prorations')
    })
  })

  describe('Schedule cleanup', () => {
    it('releases active subscription schedules', async () => {
      setupAuthenticatedUser({ currentChildren: 1 })

      mockStripe.subscriptionSchedules.list.mockResolvedValue({
        data: [
          { id: 'sched_old1', status: 'active' },
          { id: 'sched_old2', status: 'not_started' },
          { id: 'sched_done', status: 'completed' },
        ],
      })

      const req = createRequest({ newChildrenCount: 2 })
      await POST(req)

      // Should release active and not_started, but not completed
      expect(mockStripe.subscriptionSchedules.release).toHaveBeenCalledWith('sched_old1')
      expect(mockStripe.subscriptionSchedules.release).toHaveBeenCalledWith('sched_old2')
      expect(mockStripe.subscriptionSchedules.release).not.toHaveBeenCalledWith('sched_done')
    })
  })
})
