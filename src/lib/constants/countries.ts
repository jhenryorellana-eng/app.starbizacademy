export const countries = [
  { value: 'mx', label: 'México' },
  { value: 'co', label: 'Colombia' },
  { value: 'ar', label: 'Argentina' },
  { value: 'es', label: 'España' },
  { value: 'us', label: 'Estados Unidos' },
  { value: 'pe', label: 'Perú' },
  { value: 'cl', label: 'Chile' },
  { value: 've', label: 'Venezuela' },
  { value: 'ec', label: 'Ecuador' },
  { value: 'bo', label: 'Bolivia' },
  { value: 'uy', label: 'Uruguay' },
  { value: 'py', label: 'Paraguay' },
  { value: 'cr', label: 'Costa Rica' },
  { value: 'pa', label: 'Panamá' },
  { value: 'gt', label: 'Guatemala' },
  { value: 'hn', label: 'Honduras' },
  { value: 'sv', label: 'El Salvador' },
  { value: 'ni', label: 'Nicaragua' },
  { value: 'do', label: 'República Dominicana' },
  { value: 'pr', label: 'Puerto Rico' },
  { value: 'cu', label: 'Cuba' },
] as const

export type CountryCode = typeof countries[number]['value']

export function getCountryLabel(code: string): string {
  const country = countries.find((c) => c.value === code)
  return country?.label ?? code
}
