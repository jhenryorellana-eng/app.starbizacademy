/**
 * Configuración de precios para Starbiz Academy
 *
 * Plan Familiar único con precio dinámico:
 * - Base: $17/mes (incluye 1 padre + 1 hijo)
 * - Cada hijo adicional: +$10/mes
 * - Descuento anual: 25%
 */

export const PRICING = {
  basePrice: 17,        // Precio base (incluye 1 hijo)
  perChildPrice: 10,    // Por cada hijo adicional
  minChildren: 1,
  maxChildren: 10,
  annualDiscount: 0.25, // 25%
}

export type BillingCycle = 'monthly' | 'yearly'

/**
 * Calcula el precio mensual según cantidad de hijos
 * 1 hijo = $17, 2 hijos = $27, 3 hijos = $37, etc.
 */
export function calculateMonthlyPrice(children: number): number {
  const validChildren = Math.max(PRICING.minChildren, Math.min(children, PRICING.maxChildren))
  return PRICING.basePrice + (validChildren - 1) * PRICING.perChildPrice
}

/**
 * Calcula el precio anual con 25% de descuento
 */
export function calculateYearlyPrice(children: number): number {
  const monthly = calculateMonthlyPrice(children)
  return Math.round(monthly * 12 * (1 - PRICING.annualDiscount))
}

/**
 * Calcula el ahorro anual vs pago mensual
 */
export function calculateAnnualSavings(children: number): number {
  const monthly = calculateMonthlyPrice(children)
  return monthly * 12 - calculateYearlyPrice(children)
}

/**
 * Obtiene el precio según ciclo de facturación
 */
export function getPrice(children: number, billingCycle: BillingCycle): number {
  return billingCycle === 'monthly'
    ? calculateMonthlyPrice(children)
    : calculateYearlyPrice(children)
}

/**
 * Features del plan familiar organizadas por sección
 */
export const PLAN_FEATURES = {
  main: [
    '1 perfil de padre',
    '{children} {childrenLabel} junior',
    'Acceso a todas las aplicaciones',
    'Metodología Genesis 7i',
    'Mentorías semanales',
    'Contenido actualizado constantemente',
  ],
  forChild: [
    'Habilidades digitales del futuro',
    'Inglés técnico y profesional',
    'Educación financiera',
    'Liderazgo y oratoria',
    'Mentalidad emprendedora',
    '+50 cursos disponibles',
  ],
  forParent: [
    'Guías de crianza digital',
    'Comunidad de padres',
    'Seguimiento del progreso de tu hijo',
  ],
}

export type PlanFeatures = {
  main: string[]
  forChild: string[]
  forParent: string[]
}

/**
 * Genera features dinámicas según cantidad de hijos
 */
export function getFeatures(children: number): PlanFeatures {
  const childrenLabel = children === 1 ? 'perfil' : 'perfiles'
  return {
    main: PLAN_FEATURES.main.map((feature) =>
      feature
        .replace('{children}', String(children))
        .replace('{childrenLabel}', childrenLabel)
    ),
    forChild: PLAN_FEATURES.forChild,
    forParent: PLAN_FEATURES.forParent,
  }
}
