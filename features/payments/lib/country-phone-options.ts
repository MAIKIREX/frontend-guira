export interface CountryPhoneOption {
  country: string
  dialCode: string
}

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { country: 'Bolivia', dialCode: '+591' },
  { country: 'Argentina', dialCode: '+54' },
  { country: 'Brasil', dialCode: '+55' },
  { country: 'Chile', dialCode: '+56' },
  { country: 'Colombia', dialCode: '+57' },
  { country: 'Costa Rica', dialCode: '+506' },
  { country: 'Ecuador', dialCode: '+593' },
  { country: 'El Salvador', dialCode: '+503' },
  { country: 'Espana', dialCode: '+34' },
  { country: 'Estados Unidos', dialCode: '+1' },
  { country: 'Guatemala', dialCode: '+502' },
  { country: 'Mexico', dialCode: '+52' },
  { country: 'Panama', dialCode: '+507' },
  { country: 'Paraguay', dialCode: '+595' },
  { country: 'Peru', dialCode: '+51' },
  { country: 'Republica Dominicana', dialCode: '+1' },
  { country: 'Uruguay', dialCode: '+598' },
  { country: 'Venezuela', dialCode: '+58' },
]

export const DEFAULT_COUNTRY_OPTION = COUNTRY_PHONE_OPTIONS[0]

export function findCountryPhoneOptionByCountry(country?: string | null) {
  if (!country) return undefined

  const normalizedCountry = country.trim().toLowerCase()

  return COUNTRY_PHONE_OPTIONS.find((option) => option.country.toLowerCase() === normalizedCountry)
}

export function findCountryPhoneOptionByPhone(phone?: string | null) {
  if (!phone) return undefined

  const normalizedPhone = phone.trim()
  const orderedOptions = [...COUNTRY_PHONE_OPTIONS].sort((a, b) => b.dialCode.length - a.dialCode.length)

  return orderedOptions.find((option) => normalizedPhone.startsWith(option.dialCode))
}

export function stripDialCodeFromPhone(phone: string | undefined | null, dialCode: string) {
  if (!phone) return ''

  return phone
    .trim()
    .replace(new RegExp(`^\\${dialCode}\\s*`), '')
    .trim()
}
