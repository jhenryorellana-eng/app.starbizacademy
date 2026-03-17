import { describe, it, expect } from 'vitest'
import {
  PRICING,
  calculateMonthlyPrice,
  calculateYearlyPrice,
  calculateAnnualSavings,
  getPrice,
} from '@/lib/pricing/config'

describe('Pricing Configuration', () => {
  it('has correct base values', () => {
    expect(PRICING.basePrice).toBe(17)
    expect(PRICING.perChildPrice).toBe(10)
    expect(PRICING.minChildren).toBe(1)
    expect(PRICING.maxChildren).toBe(10)
    expect(PRICING.annualDiscount).toBe(0.25)
  })
})

describe('calculateMonthlyPrice', () => {
  it('returns $17 for 1 child (base price)', () => {
    expect(calculateMonthlyPrice(1)).toBe(17)
  })

  it('returns $27 for 2 children ($17 + $10)', () => {
    expect(calculateMonthlyPrice(2)).toBe(27)
  })

  it('returns $37 for 3 children ($17 + $20)', () => {
    expect(calculateMonthlyPrice(3)).toBe(37)
  })

  it('returns $107 for 10 children ($17 + $90)', () => {
    expect(calculateMonthlyPrice(10)).toBe(107)
  })

  it('clamps to min children (1) for values below 1', () => {
    expect(calculateMonthlyPrice(0)).toBe(17)
    expect(calculateMonthlyPrice(-1)).toBe(17)
  })

  it('clamps to max children (10) for values above 10', () => {
    expect(calculateMonthlyPrice(11)).toBe(107)
    expect(calculateMonthlyPrice(100)).toBe(107)
  })
})

describe('calculateYearlyPrice', () => {
  it('returns $153 for 1 child ($17 * 12 * 0.75)', () => {
    expect(calculateYearlyPrice(1)).toBe(153)
  })

  it('returns $243 for 2 children ($27 * 12 * 0.75)', () => {
    expect(calculateYearlyPrice(2)).toBe(243)
  })

  it('returns $333 for 3 children ($37 * 12 * 0.75)', () => {
    expect(calculateYearlyPrice(3)).toBe(333)
  })

  it('returns $963 for 10 children ($107 * 12 * 0.75)', () => {
    expect(calculateYearlyPrice(10)).toBe(963)
  })

  it('is always less than monthly * 12', () => {
    for (let i = 1; i <= 10; i++) {
      const yearly = calculateYearlyPrice(i)
      const monthlyTotal = calculateMonthlyPrice(i) * 12
      expect(yearly).toBeLessThan(monthlyTotal)
    }
  })
})

describe('calculateAnnualSavings', () => {
  it('calculates savings correctly for 1 child', () => {
    const savings = calculateAnnualSavings(1)
    const expected = calculateMonthlyPrice(1) * 12 - calculateYearlyPrice(1)
    expect(savings).toBe(expected)
    expect(savings).toBeGreaterThan(0)
  })

  it('savings increase with more children', () => {
    const savings1 = calculateAnnualSavings(1)
    const savings3 = calculateAnnualSavings(3)
    const savings5 = calculateAnnualSavings(5)
    expect(savings3).toBeGreaterThan(savings1)
    expect(savings5).toBeGreaterThan(savings3)
  })
})

describe('getPrice', () => {
  it('returns monthly price for monthly cycle', () => {
    expect(getPrice(2, 'monthly')).toBe(calculateMonthlyPrice(2))
  })

  it('returns yearly price for yearly cycle', () => {
    expect(getPrice(2, 'yearly')).toBe(calculateYearlyPrice(2))
  })
})
