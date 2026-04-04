/**
 * bridge-constants.ts
 * Valores exactos aceptados por la API de Bridge (https://apidocs.bridge.xyz)
 * Usar siempre estos valores en los formularios de KYC/KYB — nunca texto libre.
 */

// ─── Tipos de documento de identificación aceptados por Bridge ───────────────
export const INDIVIDUAL_ID_TYPES = [
  { value: 'passport',               label: 'Pasaporte' },
  { value: 'national_id',            label: 'Cédula de Identidad / DNI' },
  { value: 'drivers_license',        label: 'Licencia de Conducir' },
  { value: 'permanent_residency_id', label: 'Residencia Permanente' },
  { value: 'state_or_provincial_id', label: 'ID Estatal o Provincial' },
  { value: 'military_id',            label: 'ID Militar' },
  { value: 'visa',                   label: 'Visa' },
] as const

export type IndividualIdType = typeof INDIVIDUAL_ID_TYPES[number]['value']

// ─── Tipo de identificación fiscal (para UBOs y empresas) ───────────────────
export const TAX_ID_TYPES = [
  { value: 'ssn',   label: 'SSN (EE.UU.)' },
  { value: 'ein',   label: 'EIN (EE.UU. - Empresa)' },
  { value: 'tin',   label: 'TIN (Número de Identificación Tributaria)' },
  { value: 'nit',   label: 'NIT (Bolivia)' },
  { value: 'cpf',   label: 'CPF (Brasil)' },
  { value: 'cnpj',  label: 'CNPJ (Brasil - Empresa)' },
  { value: 'ruc',   label: 'RUC' },
  { value: 'cc',    label: 'Cédula de Ciudadanía' },
  { value: 'curp',  label: 'CURP (México)' },
  { value: 'rfc',   label: 'RFC (México)' },
  { value: 'other', label: 'Otro' },
] as const

// ─── Source of funds — Individual ────────────────────────────────────────────
export const INDIVIDUAL_SOURCE_OF_FUNDS = [
  { value: 'salary',                    label: 'Salario / Nómina' },
  { value: 'savings',                   label: 'Ahorros personales' },
  { value: 'investments_loans',          label: 'Inversiones / Préstamos' },
  { value: 'pension_retirement',         label: 'Pensión / Jubilación' },
  { value: 'gifts',                      label: 'Donaciones / Regalos' },
  { value: 'inheritance',               label: 'Herencia' },
  { value: 'government_benefits',       label: 'Beneficios gubernamentales' },
  { value: 'sale_of_assets_real_estate', label: 'Venta de activos / Bienes raíces' },
  { value: 'company_funds',             label: 'Fondos empresariales' },
  { value: 'ecommerce_reseller',        label: 'Comercio electrónico / Revendedor' },
  { value: 'someone_elses_funds',       label: 'Fondos de terceros' },
  { value: 'gambling_proceeds',         label: 'Ganancias de juego' },
] as const

export type IndividualSourceOfFunds = typeof INDIVIDUAL_SOURCE_OF_FUNDS[number]['value']

// ─── Account purpose — Individual ────────────────────────────────────────────
export const INDIVIDUAL_ACCOUNT_PURPOSE = [
  { value: 'personal_or_living_expenses',       label: 'Gastos personales / de vida' },
  { value: 'receive_salary',                    label: 'Recibir salario' },
  { value: 'receive_payment_for_freelancing',   label: 'Cobros por freelancing' },
  { value: 'payments_to_friends_or_family_abroad', label: 'Pagos a familia/amigos en el exterior' },
  { value: 'purchase_goods_and_services',       label: 'Compra de bienes y servicios' },
  { value: 'investment_purposes',               label: 'Inversiones' },
  { value: 'protect_wealth',                   label: 'Protección de patrimonio' },
  { value: 'ecommerce_retail_payments',         label: 'Pagos de e-commerce / retail' },
  { value: 'charitable_donations',             label: 'Donaciones benéficas' },
  { value: 'operating_a_company',              label: 'Operación de una empresa' },
  { value: 'other',                            label: 'Otro' },
] as const

export type IndividualAccountPurpose = typeof INDIVIDUAL_ACCOUNT_PURPOSE[number]['value']

// ─── Expected monthly payments — Individual ───────────────────────────────────
export const EXPECTED_MONTHLY_PAYMENTS = [
  { value: '0_4999',       label: 'Menos de $5,000 USD/mes' },
  { value: '5000_9999',    label: '$5,000 – $9,999 USD/mes' },
  { value: '10000_49999',  label: '$10,000 – $49,999 USD/mes' },
  { value: '50000_plus',   label: '$50,000+ USD/mes' },
] as const

export type ExpectedMonthlyPayments = typeof EXPECTED_MONTHLY_PAYMENTS[number]['value']

// ─── Business types ───────────────────────────────────────────────────────────
export const BUSINESS_TYPES = [
  { value: 'corporation', label: 'Sociedad Anónima (S.A. / Corporation)' },
  { value: 'llc',         label: 'Sociedad de Responsabilidad Limitada (S.R.L. / LLC)' },
  { value: 'partnership', label: 'Sociedad Colectiva / Partnership' },
  { value: 'sole_prop',   label: 'Empresa Unipersonal / Sole Proprietorship' },
  { value: 'cooperative', label: 'Cooperativa' },
  { value: 'trust',       label: 'Fideicomiso / Trust' },
  { value: 'other',       label: 'Otro' },
] as const

export type BusinessType = typeof BUSINESS_TYPES[number]['value']

// ─── Source of funds — Business ───────────────────────────────────────────────
export const BUSINESS_SOURCE_OF_FUNDS = [
  { value: 'sales_of_goods_and_services', label: 'Ventas de bienes y servicios' },
  { value: 'owners_capital',             label: 'Capital de los socios' },
  { value: 'investment_proceeds',        label: 'Rendimientos de inversiones' },
  { value: 'business_loans',            label: 'Préstamos empresariales' },
  { value: 'grants',                    label: 'Subvenciones / Donaciones' },
  { value: 'inter_company_funds',       label: 'Fondos intercompañía' },
  { value: 'sale_of_assets',            label: 'Venta de activos' },
  { value: 'treasury_reserves',         label: 'Reservas de tesorería' },
  { value: 'legal_settlement',          label: 'Acuerdo legal' },
  { value: 'pension_retirement',        label: 'Pensión / Fondo de retiro' },
  { value: 'third_party_funds',         label: 'Fondos de terceros' },
] as const

export type BusinessSourceOfFunds = typeof BUSINESS_SOURCE_OF_FUNDS[number]['value']

// ─── Account purpose — Business ───────────────────────────────────────────────
export const BUSINESS_ACCOUNT_PURPOSE = [
  { value: 'purchase_goods_and_services',         label: 'Compra de bienes y servicios' },
  { value: 'receive_payments_for_goods_and_services', label: 'Cobros por bienes/servicios' },
  { value: 'payroll',                             label: 'Pago de nómina' },
  { value: 'treasury_management',                label: 'Gestión de tesorería' },
  { value: 'investment_purposes',                label: 'Inversiones' },
  { value: 'payments_to_friends_or_family_abroad', label: 'Pagos internacionales' },
  { value: 'protect_wealth',                     label: 'Protección de patrimonio' },
  { value: 'ecommerce_retail_payments',          label: 'Pagos e-commerce / retail' },
  { value: 'charitable_donations',              label: 'Donaciones benéficas' },
  { value: 'tax_optimization',                  label: 'Optimización fiscal' },
  { value: 'third_party_money_transmission',    label: 'Transmisión de fondos de terceros' },
  { value: 'other',                             label: 'Otro' },
] as const

export type BusinessAccountPurpose = typeof BUSINESS_ACCOUNT_PURPOSE[number]['value']

// ─── Countries — ISO 3166-1 alpha-3 (lista reducida LAC + principales) ───────
export const BRIDGE_COUNTRIES = [
  { value: 'ARG', label: 'Argentina' },
  { value: 'BOL', label: 'Bolivia' },
  { value: 'BRA', label: 'Brasil' },
  { value: 'CAN', label: 'Canadá' },
  { value: 'CHL', label: 'Chile' },
  { value: 'COL', label: 'Colombia' },
  { value: 'CRI', label: 'Costa Rica' },
  { value: 'CUB', label: 'Cuba' },
  { value: 'DOM', label: 'República Dominicana' },
  { value: 'ECU', label: 'Ecuador' },
  { value: 'SLV', label: 'El Salvador' },
  { value: 'ESP', label: 'España' },
  { value: 'USA', label: 'Estados Unidos' },
  { value: 'GTM', label: 'Guatemala' },
  { value: 'HND', label: 'Honduras' },
  { value: 'MEX', label: 'México' },
  { value: 'NIC', label: 'Nicaragua' },
  { value: 'PAN', label: 'Panamá' },
  { value: 'PRY', label: 'Paraguay' },
  { value: 'PER', label: 'Perú' },
  { value: 'PRT', label: 'Portugal' },
  { value: 'URY', label: 'Uruguay' },
  { value: 'VEN', label: 'Venezuela' },
  { value: 'GBR', label: 'Reino Unido' },
  { value: 'DEU', label: 'Alemania' },
  { value: 'FRA', label: 'Francia' },
  { value: 'ITA', label: 'Italia' },
  { value: 'CHN', label: 'China' },
  { value: 'JPN', label: 'Japón' },
  { value: 'KOR', label: 'Corea del Sur' },
  { value: 'IND', label: 'India' },
  { value: 'AUS', label: 'Australia' },
  { value: 'NZL', label: 'Nueva Zelanda' },
  { value: 'ZAF', label: 'Sudáfrica' },
  { value: 'NGA', label: 'Nigeria' },
  { value: 'KEN', label: 'Kenia' },
] as const

export type BridgeCountryCode = typeof BRIDGE_COUNTRIES[number]['value']

// ─── Helper: extract values only (for zod enum) ──────────────────────────────
export const BRIDGE_COUNTRY_CODES = BRIDGE_COUNTRIES.map(c => c.value) as [string, ...string[]]
export const INDIVIDUAL_ID_TYPE_VALUES = INDIVIDUAL_ID_TYPES.map(t => t.value) as [string, ...string[]]
export const INDIVIDUAL_SOF_VALUES = INDIVIDUAL_SOURCE_OF_FUNDS.map(t => t.value) as [string, ...string[]]
export const INDIVIDUAL_PURPOSE_VALUES = INDIVIDUAL_ACCOUNT_PURPOSE.map(t => t.value) as [string, ...string[]]
export const MONTHLY_PAYMENT_VALUES = EXPECTED_MONTHLY_PAYMENTS.map(t => t.value) as [string, ...string[]]
export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map(t => t.value) as [string, ...string[]]
export const BUSINESS_SOF_VALUES = BUSINESS_SOURCE_OF_FUNDS.map(t => t.value) as [string, ...string[]]
export const BUSINESS_PURPOSE_VALUES = BUSINESS_ACCOUNT_PURPOSE.map(t => t.value) as [string, ...string[]]
