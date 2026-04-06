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

// ─── Source of funds — Individual ─────────────────────────────────────────────
// IMPORTANTE: Valores alineados con Bridge API enum (actualizado según OpenAPI spec)
export const INDIVIDUAL_SOURCE_OF_FUNDS = [
  { value: 'salary',                      label: 'Salario / Nómina' },
  { value: 'savings',                     label: 'Ahorros' },
  { value: 'company_funds',               label: 'Fondos empresariales' },
  { value: 'investments_loans',           label: 'Inversiones / Préstamos' },
  { value: 'government_benefits',         label: 'Beneficios gubernamentales' },
  { value: 'pension_retirement',          label: 'Pensión / Jubilación' },
  { value: 'inheritance',                 label: 'Herencia' },
  { value: 'gifts',                       label: 'Donación / Regalo' },
  { value: 'sale_of_assets_real_estate',  label: 'Venta de activos / inmuebles' },
  { value: 'ecommerce_reseller',          label: 'Revendedor / E-commerce' },
  { value: 'someone_elses_funds',         label: 'Fondos de terceros' },
  { value: 'gambling_proceeds',           label: 'Ingresos de juegos de azar' },
] as const

export type IndividualSourceOfFunds = typeof INDIVIDUAL_SOURCE_OF_FUNDS[number]['value']

// ─── Account purpose — Individual ─────────────────────────────────────────────
// IMPORTANTE: Valores alineados con Bridge API enum (actualizado según OpenAPI spec)
export const INDIVIDUAL_ACCOUNT_PURPOSE = [
  { value: 'payments_to_friends_or_family_abroad', label: 'Pagos a familia / amigos en el extranjero' },
  { value: 'personal_or_living_expenses',          label: 'Gastos personales / de vida' },
  { value: 'receive_salary',                       label: 'Recibir salario' },
  { value: 'purchase_goods_and_services',          label: 'Compra de bienes y servicios' },
  { value: 'receive_payment_for_freelancing',      label: 'Cobros por trabajo freelance' },
  { value: 'investment_purposes',                  label: 'Inversiones' },
  { value: 'operating_a_company',                  label: 'Operación de una empresa' },
  { value: 'ecommerce_retail_payments',            label: 'Pagos e-commerce / retail' },
  { value: 'charitable_donations',                 label: 'Donaciones benéficas' },
  { value: 'protect_wealth',                       label: 'Protección de patrimonio' },
  { value: 'other',                                label: 'Otro' },
] as const

export type IndividualAccountPurpose = typeof INDIVIDUAL_ACCOUNT_PURPOSE[number]['value']

// ─── Expected monthly payments — Individual & Business ───────────────────────
// Valores exactos del enum Bridge según OpenAPI spec (actualizados)
export const EXPECTED_MONTHLY_PAYMENTS = [
  { value: '0_4999',      label: 'Menos de $5,000 USD/mes' },
  { value: '5000_9999',   label: '$5,000 – $9,999 USD/mes' },
  { value: '10000_49999', label: '$10,000 – $49,999 USD/mes' },
  { value: '50000_plus',  label: '$50,000+ USD/mes' },
] as const

export type ExpectedMonthlyPayments = typeof EXPECTED_MONTHLY_PAYMENTS[number]['value']

// ─── Estimated annual revenue — Business (P1 high-risk) ──────────────────────
// Valores exactos del enum Bridge OpenAPI spec
export const ANNUAL_REVENUE_RANGES = [
  { value: '0_99999',             label: 'Menos de $100,000 USD/año' },
  { value: '100000_999999',       label: '$100,000 – $999,999 USD/año' },
  { value: '1000000_9999999',     label: '$1M – $9.9M USD/año' },
  { value: '10000000_49999999',   label: '$10M – $49.9M USD/año' },
  { value: '50000000_249999999',  label: '$50M – $249M USD/año' },
  { value: '250000000_plus',      label: '$250M+ USD/año' },
] as const

export type AnnualRevenueRange = typeof ANNUAL_REVENUE_RANGES[number]['value']

// ─── Employment status — Individual (P1 high-risk) ────────────────────────────
// Valores exactos Bridge API OpenAPI spec (agregado: homemaker; removido: other)
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed',      label: 'Empleado (relación de dependencia)' },
  { value: 'self_employed', label: 'Independiente / Autónomo' },
  { value: 'unemployed',    label: 'Desempleado' },
  { value: 'student',       label: 'Estudiante' },
  { value: 'retired',       label: 'Jubilado / Retirado' },
  { value: 'homemaker',     label: 'Amo/a de casa' },
] as const

export type EmploymentStatus = typeof EMPLOYMENT_STATUS_OPTIONS[number]['value']

// ─── Most Recent Occupation — Individual (required for restricted countries/high-risk) ──
// Códigos alfanuméricos según lista oficial de Bridge
// Ref: https://apidocs.bridge.xyz/platform/customers/compliance/sof-eu-most-recent-occupation-list
// Selección de los más relevantes para clientes latinoamericanos
export const OCCUPATION_OPTIONS = [
  { value: '111021', label: 'Chief Executive / Director General' },
  { value: '111022', label: 'General Manager / Gerente General' },
  { value: '121111', label: 'Finance Manager / Gerente Financiero' },
  { value: '121112', label: 'Accounting / Contador' },
  { value: '131111', label: 'Sales Manager / Gerente de Ventas' },
  { value: '211111', label: 'Physicist / Físico' },
  { value: '211311', label: 'Chemist / Químico' },
  { value: '212111', label: 'Meteorologist / Meteorólogo' },
  { value: '212311', label: 'Environmental Scientist / Científico Ambiental' },
  { value: '221111', label: 'Civil Engineer / Ingeniero Civil' },
  { value: '221211', label: 'Electrical Engineer / Ingeniero Eléctrico' },
  { value: '221311', label: 'Mechanical Engineer / Ingeniero Mecánico' },
  { value: '222111', label: 'Software Engineer / Ingeniero de Software' },
  { value: '222211', label: 'Database Administrator / Admin de Base de Datos' },
  { value: '222311', label: 'IT Systems Analyst / Analista de Sistemas' },
  { value: '231111', label: 'Doctor / Médico General' },
  { value: '231211', label: 'Surgeon / Cirujano' },
  { value: '231311', label: 'Dentist / Dentista' },
  { value: '231411', label: 'Pharmacist / Farmacéutico' },
  { value: '231511', label: 'Nurse / Enfermero(a)' },
  { value: '241111', label: 'Lawyer / Abogado' },
  { value: '241211', label: 'Judge / Juez' },
  { value: '242111', label: 'Economist / Economista' },
  { value: '242211', label: 'Market Researcher / Investigador de Mercados' },
  { value: '243111', label: 'Psychologist / Psicólogo' },
  { value: '251111', label: 'University Lecturer / Docente Universitario' },
  { value: '251211', label: 'Primary/Secondary Teacher / Maestro' },
  { value: '261111', label: 'Architect / Arquitecto' },
  { value: '261211', label: 'Graphic Designer / Diseñador Gráfico' },
  { value: '262111', label: 'Journalist / Periodista' },
  { value: '263111', label: 'Artist / Artista' },
  { value: '271111', label: 'Financial Analyst / Analista Financiero' },
  { value: '271211', label: 'Investment Manager / Gestor de Inversiones' },
  { value: '291291', label: 'Other Professional / Otro Profesional' },
  { value: '311111', label: 'Agriculture Worker / Trabajador Agrícola' },
  { value: '321111', label: 'Mining Worker / Trabajador Minero' },
  { value: '331111', label: 'Factory Worker / Trabajador de Fábrica' },
  { value: '411111', label: 'Sales Person / Vendedor' },
  { value: '421111', label: 'Customer Service / Atención al Cliente' },
  { value: '431111', label: 'Office Clerk / Empleado Administrativo' },
  { value: '441111', label: 'Store Keeper / Cajero / Almacenista' },
  { value: '511111', label: 'Driver / Conductor' },
  { value: '521111', label: 'Construction Worker / Obrero de Construcción' },
  { value: '531111', label: 'Electrician / Electricista' },
  { value: '541111', label: 'Plumber / Plomero' },
  { value: '551111', label: 'Mechanic / Mecánico' },
  { value: '911111', label: 'Domestic Worker / Trabajador del Hogar' },
  { value: '921111', label: 'Agricultural Laborer / Jornalero Agrícola' },
  { value: '931111', label: 'Student / Estudiante' },
  { value: '941111', label: 'Retired / Jubilado' },
  { value: '951111', label: 'Unemployed / Desempleado' },
] as const

export type OccupationCode = typeof OCCUPATION_OPTIONS[number]['value']
export const OCCUPATION_VALUES = OCCUPATION_OPTIONS.map(o => o.value) as unknown as readonly [string, ...string[]]

// ─── High-risk activities — Business (P1) ────────────────────────────────────
// Valores exactos del enum Bridge OpenAPI spec
export const HIGH_RISK_ACTIVITIES = [
  { value: 'adult_entertainment',                                          label: 'Entretenimiento para adultos' },
  { value: 'gambling',                                                     label: 'Apuestas / Juegos de azar' },
  { value: 'hold_client_funds',                                            label: 'Custodia de fondos de clientes' },
  { value: 'investment_services',                                          label: 'Servicios de inversión' },
  { value: 'lending_banking',                                              label: 'Préstamos y banca' },
  { value: 'marijuana_or_related_services',                                label: 'Cannabis / Marihuana' },
  { value: 'money_services',                                               label: 'Servicios de dinero (MSB)' },
  { value: 'nicotine_tobacco_or_related_services',                         label: 'Tabaco / Nicotina' },
  { value: 'operate_foreign_exchange_virtual_currencies_brokerage_otc',    label: 'Exchange / OTC de divisas o criptomonedas' },
  { value: 'pharmaceuticals',                                              label: 'Farmacéutica / Medicamentos' },
  { value: 'precious_metals_precious_stones_jewelry',                      label: 'Metales preciosos / Joyería' },
  { value: 'safe_deposit_box_rentals',                                     label: 'Alquiler de cajas de seguridad' },
  { value: 'third_party_payment_processing',                               label: 'Procesamiento de pagos de terceros' },
  { value: 'weapons_firearms_and_explosives',                              label: 'Armas de fuego y explosivos' },
  { value: 'none_of_the_above',                                            label: 'Ninguna de las anteriores' },
] as const

export type HighRiskActivity = typeof HIGH_RISK_ACTIVITIES[number]['value']

// ─── Business industries — NAICS 2022 codes (selección resumida más relevantes) ──
// Ref: https://apidocs.bridge.xyz/platform/customers/compliance/business-industry-list-updated-2022-naics-codes
export const BUSINESS_INDUSTRIES = [
  { value: '111150',  label: 'Agricultura — Cultivo de granos' },
  { value: '212311',  label: 'Minería y Canteras' },
  { value: '221112',  label: 'Generación eléctrica (combustible fósil)' },
  { value: '221114',  label: 'Generación de energía solar' },
  { value: '311111',  label: 'Manufactura de alimentos' },
  { value: '322110',  label: 'Manufactura de papel / celulosa' },
  { value: '324110',  label: 'Refinerías de petróleo' },
  { value: '334111',  label: 'Manufactura de computadoras / electrónica' },
  { value: '334210',  label: 'Equipos de telecomunicaciones' },
  { value: '423110',  label: 'Comercio mayorista — Automotriz' },
  { value: '441110',  label: 'Concesionarios de autos' },
  { value: '444110',  label: 'Tiendas de materiales de construcción' },
  { value: '445110',  label: 'Supermercados / Grocery' },
  { value: '449110',  label: 'Muebles y mobiliario' },
  { value: '455110',  label: 'Tiendas departamentales' },
  { value: '484110',  label: 'Transporte de carga (local)' },
  { value: '484121',  label: 'Transporte de carga (larga distancia)' },
  { value: '491110',  label: 'Servicio postal / courier' },
  { value: '511210',  label: 'Editores de software' },
  { value: '517111',  label: 'Telecomunicaciones (línea fija)' },
  { value: '517112',  label: 'Telecomunicaciones (inalámbrica)' },
  { value: '518210',  label: 'Procesamiento de datos / hosting / cloud' },
  { value: '519290',  label: 'Servicios de información / portales web' },
  { value: '521110',  label: 'Banca central' },
  { value: '522110',  label: 'Banca comercial' },
  { value: '522130',  label: 'Cooperativas de ahorro y crédito' },
  { value: '522210',  label: 'Emisión de tarjetas de crédito' },
  { value: '522291',  label: 'Crédito al consumo / préstamos' },
  { value: '522320',  label: 'Procesamiento de pagos (fintech)' },
  { value: '523150',  label: 'Banca de inversión y valores' },
  { value: '523910',  label: 'Intermediación financiera' },
  { value: '523940',  label: 'Gestión de portafolio / asesoría financiera' },
  { value: '524210',  label: 'Seguros' },
  { value: '531110',  label: 'Alquiler de bienes inmuebles' },
  { value: '531210',  label: 'Corretaje de bienes inmuebles' },
  { value: '541110',  label: 'Servicios legales / abogados' },
  { value: '541211',  label: 'Contabilidad / auditoría' },
  { value: '541511',  label: 'Programación / desarrollo de software' },
  { value: '541512',  label: 'Diseño de sistemas informáticos' },
  { value: '541611',  label: 'Consultoría de negocios' },
  { value: '541613',  label: 'Consultoría de marketing' },
  { value: '541810',  label: 'Agencias de publicidad' },
  { value: '561311',  label: 'Agencias de empleo' },
  { value: '561510',  label: 'Agencias de viajes' },
  { value: '561790',  label: 'Servicios de jardinería / paisajismo' },
  { value: '611110',  label: 'Educación primaria / secundaria' },
  { value: '611310',  label: 'Educación universitaria' },
  { value: '621111',  label: 'Consultorios médicos' },
  { value: '621210',  label: 'Consultorios dentales' },
  { value: '622110',  label: 'Hospitales generales' },
  { value: '711190',  label: 'Artes escénicas / espectáculos' },
  { value: '713940',  label: 'Gimnasios y centros deportivos' },
  { value: '721110',  label: 'Hoteles y resorts' },
  { value: '722511',  label: 'Restaurantes (servicio completo)' },
  { value: '722513',  label: 'Restaurantes (rápido)' },
  { value: '811111',  label: 'Reparación automotriz general' },
  { value: '812111',  label: 'Peluquerías / barberías' },
  { value: '812210',  label: 'Funerarias / servicios fúnebres' },
  { value: '812310',  label: 'Lavanderías / tintorerías' },
  { value: '813110',  label: 'Organizaciones religiosas' },
  { value: '813211',  label: 'ONGs / fundaciones caritativas' },
  { value: '926110',  label: 'Administración pública / programas económicos' },
] as const

export type BusinessIndustryCode = typeof BUSINESS_INDUSTRIES[number]['value']
export const BUSINESS_INDUSTRY_VALUES = BUSINESS_INDUSTRIES.map(i => i.value) as unknown as readonly [string, ...string[]]

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
  { value: 'purchase_goods_and_services',             label: 'Compra de bienes y servicios' },
  { value: 'receive_payments_for_goods_and_services', label: 'Cobros por bienes/servicios' },
  { value: 'payroll',                                 label: 'Pago de nómina' },
  { value: 'treasury_management',                    label: 'Gestión de tesorería' },
  { value: 'investment_purposes',                    label: 'Inversiones' },
  { value: 'payments_to_friends_or_family_abroad',   label: 'Pagos internacionales' },
  { value: 'protect_wealth',                         label: 'Protección de patrimonio' },
  { value: 'ecommerce_retail_payments',              label: 'Pagos e-commerce / retail' },
  { value: 'charitable_donations',                   label: 'Donaciones benéficas' },
  // FIX D-02: missing value added to match Bridge spec (13 values total)
  { value: 'personal_or_living_expenses',            label: 'Gastos personales / manutención' },
  { value: 'tax_optimization',                       label: 'Optimización fiscal' },
  { value: 'third_party_money_transmission',         label: 'Transmisión de fondos de terceros' },
  { value: 'other',                                  label: 'Otro' },
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
export const BRIDGE_COUNTRY_CODES = BRIDGE_COUNTRIES.map(c => c.value) as unknown as readonly [string, ...string[]]
export const INDIVIDUAL_ID_TYPE_VALUES = INDIVIDUAL_ID_TYPES.map(t => t.value) as unknown as readonly [string, ...string[]]
export const INDIVIDUAL_SOF_VALUES = INDIVIDUAL_SOURCE_OF_FUNDS.map(t => t.value) as unknown as readonly [string, ...string[]]
export const INDIVIDUAL_PURPOSE_VALUES = INDIVIDUAL_ACCOUNT_PURPOSE.map(t => t.value) as unknown as readonly [string, ...string[]]
export const MONTHLY_PAYMENT_VALUES = EXPECTED_MONTHLY_PAYMENTS.map(t => t.value) as unknown as readonly [string, ...string[]]
export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map(t => t.value) as unknown as readonly [string, ...string[]]
export const BUSINESS_SOF_VALUES = BUSINESS_SOURCE_OF_FUNDS.map(t => t.value) as unknown as readonly [string, ...string[]]
export const BUSINESS_PURPOSE_VALUES = BUSINESS_ACCOUNT_PURPOSE.map(t => t.value) as unknown as readonly [string, ...string[]]
// P1 / New exports
export const EMPLOYMENT_STATUS_VALUES = EMPLOYMENT_STATUS_OPTIONS.map(t => t.value) as unknown as readonly [string, ...string[]]
export const ANNUAL_REVENUE_VALUES = ANNUAL_REVENUE_RANGES.map(t => t.value) as unknown as readonly [string, ...string[]]
export const HIGH_RISK_ACTIVITY_VALUES = HIGH_RISK_ACTIVITIES.map(t => t.value) as unknown as readonly [string, ...string[]]

// ─── Dial codes — ISO 3166-1 alpha-3 → country calling code ─────────────────
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  ARG: '+54',
  BOL: '+591',
  BRA: '+55',
  CAN: '+1',
  CHL: '+56',
  COL: '+57',
  CRI: '+506',
  CUB: '+53',
  DOM: '+1',
  ECU: '+593',
  SLV: '+503',
  ESP: '+34',
  USA: '+1',
  GTM: '+502',
  HND: '+504',
  MEX: '+52',
  NIC: '+505',
  PAN: '+507',
  PRY: '+595',
  PER: '+51',
  PRT: '+351',
  URY: '+598',
  VEN: '+58',
  GBR: '+44',
  DEU: '+49',
  FRA: '+33',
  ITA: '+39',
  CHN: '+86',
  JPN: '+81',
  KOR: '+82',
  IND: '+91',
  AUS: '+61',
  NZL: '+64',
  ZAF: '+27',
  NGA: '+234',
  KEN: '+254',
}
