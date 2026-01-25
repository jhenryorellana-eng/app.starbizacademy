import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export type BillingCycle = 'monthly' | 'yearly'

/**
 * IDs de precios en Stripe
 *
 * Estructura:
 * - Plan Familiar Base: $17/mes (incluye 1 padre + 1 hijo)
 * - Hijo Adicional: $10/mes por cada hijo extra
 */
export const STRIPE_PRICES = {
  familyBase: {
    monthly: process.env.STRIPE_PRICE_FAMILY_BASE_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_FAMILY_BASE_YEARLY!,
  },
  additionalChild: {
    monthly: process.env.STRIPE_PRICE_ADDITIONAL_CHILD_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_ADDITIONAL_CHILD_YEARLY!,
  },
}

/**
 * Obtiene el Price ID del plan base según ciclo de facturación
 */
export function getFamilyBasePriceId(billingCycle: BillingCycle): string {
  return STRIPE_PRICES.familyBase[billingCycle]
}

/**
 * Obtiene el Price ID de hijo adicional según ciclo de facturación
 */
export function getAdditionalChildPriceId(billingCycle: BillingCycle): string {
  return STRIPE_PRICES.additionalChild[billingCycle]
}

/**
 * Genera los line items para Stripe Checkout
 * @param childrenCount - Cantidad total de hijos
 * @param billingCycle - Ciclo de facturación
 */
export function buildLineItems(
  childrenCount: number,
  billingCycle: BillingCycle
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: getFamilyBasePriceId(billingCycle),
      quantity: 1,
    },
  ]

  // Agregar hijos adicionales si hay más de 1
  if (childrenCount > 1) {
    lineItems.push({
      price: getAdditionalChildPriceId(billingCycle),
      quantity: childrenCount - 1,
    })
  }

  return lineItems
}
