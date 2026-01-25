/**
 * Family Code Generator
 *
 * Generates unique family access codes:
 * - Parent codes: P-XXXXXXXX (P + 8 digits)
 * - Child codes: E-XXXXXXXX (E + 8 digits)
 */

type CodeType = 'parent' | 'child'

const CODE_PREFIXES: Record<CodeType, string> = {
  parent: 'P',
  child: 'E',
}

/**
 * Generates a random 8-digit numeric string
 */
function generateRandomDigits(length: number = 8): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString()
  }
  return result
}

/**
 * Generates a family code in the format X-XXXXXXXX
 * @param type - 'parent' or 'child'
 * @returns A formatted code string
 */
export function generateFamilyCode(type: CodeType): string {
  const prefix = CODE_PREFIXES[type]
  const digits = generateRandomDigits(8)
  return `${prefix}-${digits}`
}

/**
 * Validates a family code format
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export function isValidFamilyCode(code: string): boolean {
  const pattern = /^[PE]-\d{8}$/
  return pattern.test(code)
}

/**
 * Extracts the code type from a family code
 * @param code - The family code
 * @returns 'parent', 'child', or null if invalid
 */
export function getCodeType(code: string): CodeType | null {
  if (!isValidFamilyCode(code)) return null
  const prefix = code[0]
  return prefix === 'P' ? 'parent' : prefix === 'E' ? 'child' : null
}

/**
 * Generates multiple unique codes
 * @param type - 'parent' or 'child'
 * @param count - Number of codes to generate
 * @param existingCodes - Set of already existing codes to avoid duplicates
 * @returns Array of unique codes
 */
export function generateUniqueCodes(
  type: CodeType,
  count: number,
  existingCodes: Set<string> = new Set()
): string[] {
  const codes: string[] = []
  const maxAttempts = count * 10 // Prevent infinite loops

  let attempts = 0
  while (codes.length < count && attempts < maxAttempts) {
    const code = generateFamilyCode(type)
    if (!existingCodes.has(code) && !codes.includes(code)) {
      codes.push(code)
    }
    attempts++
  }

  if (codes.length < count) {
    throw new Error('Unable to generate enough unique codes')
  }

  return codes
}
