import { describe, it, expect } from 'vitest'

/**
 * Tests for the membership display logic on the home page.
 * This verifies the fix for the "-20 dias" bug.
 */

function getMembershipDisplayText(
  hasActiveMembership: boolean,
  daysRemaining: number | null,
  membershipStatus: string | null
): string {
  // This mirrors the logic in inicio/page.tsx
  if (hasActiveMembership && daysRemaining !== null && daysRemaining > 0) {
    return `${daysRemaining} días`
  }
  if (membershipStatus) {
    return 'Inactivo'
  }
  return 'Sin membresía'
}

function getMembershipBadge(
  membershipStatus: string | null,
  membershipPlan: string | null
): string {
  if (membershipStatus === 'active') return 'Activo'
  if (membershipStatus === 'past_due') return 'Pendiente'
  if (membershipPlan) return 'Inactivo'
  return 'Sin Plan'
}

describe('Membership display text', () => {
  it('shows days remaining when membership is active and positive', () => {
    expect(getMembershipDisplayText(true, 15, 'active')).toBe('15 días')
  })

  it('shows days remaining for 1 day', () => {
    expect(getMembershipDisplayText(true, 1, 'active')).toBe('1 días')
  })

  it('shows "Inactivo" when days are negative (expired membership)', () => {
    expect(getMembershipDisplayText(true, -20, 'active')).toBe('Inactivo')
  })

  it('shows "Inactivo" when days are zero', () => {
    expect(getMembershipDisplayText(true, 0, 'active')).toBe('Inactivo')
  })

  it('shows "Inactivo" for canceled membership with status', () => {
    expect(getMembershipDisplayText(false, null, 'canceled')).toBe('Inactivo')
  })

  it('shows "Sin membresía" when no membership at all', () => {
    expect(getMembershipDisplayText(false, null, null)).toBe('Sin membresía')
  })
})

describe('Membership badge', () => {
  it('shows "Activo" for active membership', () => {
    expect(getMembershipBadge('active', 'Familiar 1')).toBe('Activo')
  })

  it('shows "Pendiente" for past_due membership', () => {
    expect(getMembershipBadge('past_due', 'Familiar 1')).toBe('Pendiente')
  })

  it('shows "Inactivo" for canceled membership with plan', () => {
    expect(getMembershipBadge('canceled', 'Familiar 1')).toBe('Inactivo')
  })

  it('shows "Sin Plan" when no membership exists', () => {
    expect(getMembershipBadge(null, null)).toBe('Sin Plan')
  })
})
