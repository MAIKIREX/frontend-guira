// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO DE RUTAS BRIDGE — FALLBACK ESTÁTICO
//
//  FUENTE DE VERDAD: backend GET /payment-orders/route-catalog
//  Usar PaymentsService.getRouteCatalog() siempre que sea posible.
//  Este archivo solo se usa como fallback SSR / offline.
//
//  Si se modifica este archivo, replicar el cambio en el backend:
//  backend_Guira/src/common/constants/bridge-route-catalog.constants.ts
// ═══════════════════════════════════════════════════════════════════

export interface BridgeRouteEntry {
  destinations: string[]
  min: number
}

/**
 * Catálogo de rutas soportadas para on-ramp crypto_to_bridge_wallet.
 * Cada key es una red de origen; sub-keys son monedas de origen.
 */
export const BRIDGE_RAMP_ON_ROUTES: Record<string, Record<string, BridgeRouteEntry>> = {
  ethereum: {
    usdc:  { destinations: ['usdc', 'usdb', 'pyusd', 'eurc'], min: 1 },
    usdt:  { destinations: ['usdc', 'usdt', 'usdb'],          min: 2 },
    eurc:  { destinations: ['usdc', 'usdb', 'eurc'],           min: 1 },
    pyusd: { destinations: ['usdc', 'pyusd'],                  min: 1 },
  },
  solana: {
    usdc:  { destinations: ['usdc', 'usdb', 'pyusd', 'eurc'], min: 1 },
    usdt:  { destinations: ['usdc', 'usdb'],                   min: 2 },
    usdb:  { destinations: ['pyusd', 'usdt'],                  min: 1 },
    eurc:  { destinations: ['usdc', 'usdb', 'eurc'],           min: 1 },
    pyusd: { destinations: ['usdc', 'usdt'],                   min: 1 },
  },
  tron: {
    usdt:  { destinations: ['usdc', 'usdt', 'usdb', 'pyusd'], min: 5 },
  },
  polygon: {
    usdc:  { destinations: ['usdc', 'usdt', 'usdb', 'pyusd', 'eurc'], min: 1 },
  },
  stellar: {
    usdc:  { destinations: ['usdc', 'usdt', 'usdb', 'pyusd', 'eurc'], min: 1 },
  },
}

/**
 * Tokens destino permitidos para fiat_bo_to_bridge_wallet (Etapa 1).
 * EURC excluido porque requiere tasa BOB_EUR no disponible.
 */
export const FIAT_BO_ALLOWED_DESTINATION_CURRENCIES = [
  'usdc',
  'usdt',
  'usdb',
  'pyusd',
] as const

/** Dado una red, retorna las monedas de origen válidas */
export function getSourceCurrencies(network: string | null | undefined): string[] {
  if (!network) return []
  return Object.keys(BRIDGE_RAMP_ON_ROUTES[network] ?? {})
}

/** Dado una red + moneda origen, retorna las monedas destino válidas */
export function getDestinationCurrencies(network: string | null | undefined, sourceCurrency: string | null | undefined): string[] {
  if (!network || !sourceCurrency) return []
  return BRIDGE_RAMP_ON_ROUTES[network]?.[sourceCurrency.toLowerCase()]?.destinations ?? []
}

/** Dado una red + moneda origen, retorna el mínimo de transacción */
export function getMinAmount(network: string | null | undefined, sourceCurrency: string | null | undefined): number {
  if (!network || !sourceCurrency) return 1
  return BRIDGE_RAMP_ON_ROUTES[network]?.[sourceCurrency.toLowerCase()]?.min ?? 1
}

/** Valida si una combinación red/origen/destino es soportada por Bridge */
export function isValidRoute(network: string | null | undefined, sourceCurrency: string | null | undefined, destCurrency: string | null | undefined): boolean {
  if (!network || !sourceCurrency || !destCurrency) return false
  const route = BRIDGE_RAMP_ON_ROUTES[network]?.[sourceCurrency.toLowerCase()]
  if (!route) return false
  return route.destinations.includes(destCurrency.toLowerCase())
}

/** Valida si un token es válido como destino para fiat_bo_to_bridge_wallet */
export function isValidFiatBoDestination(currency: string | null | undefined): boolean {
  if (!currency) return false
  return (FIAT_BO_ALLOWED_DESTINATION_CURRENCIES as readonly string[]).includes(currency.toLowerCase())
}

/** Unión de todos los tokens destino posibles para crypto_to_bridge_wallet (independiente de red/origen) */
export function getAllCryptoDestCurrencies(): string[] {
  const set = new Set<string>()
  for (const nets of Object.values(BRIDGE_RAMP_ON_ROUTES)) {
    for (const route of Object.values(nets)) {
      route.destinations.forEach((d) => set.add(d))
    }
  }
  return [...set]
}

// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO DE RUTAS OFF-RAMP (bridge_wallet_to_crypto)
//  Fuente: lista_bridge_out.md (filtrada a tokens soportados)
//
//  Estructura: { [source_currency]: { [dest_network]: { [dest_currency]: min_amount } } }
//
//  Reglas aplicadas:
//  - Source rail siempre Solana (wallet custodial)
//  - DAI y USDG excluidos (no en ALLOWED_CRYPTO_CURRENCIES)
//  - Red Base excluida (sin rutas soportadas desde Solana)
// ═══════════════════════════════════════════════════════════════════

/** Tokens de origen válidos para off-ramp */
export const OFF_RAMP_SOURCE_CURRENCIES = ['usdc', 'usdt', 'usdb', 'pyusd', 'eurc'] as const

/**
 * Catálogo de rutas soportadas para off-ramp bridge_wallet_to_crypto.
 * { [source_currency]: { [dest_network]: { [dest_currency]: min_amount } } }
 */
export const BRIDGE_RAMP_OFF_ROUTES: Record<string, Record<string, Record<string, number>>> = {
  usdc: {
    ethereum: { pyusd: 1, usdc: 1, usdt: 20 },
    solana:   { eurc: 1, pyusd: 1, usdb: 1, usdc: 1 },
    tron:     { usdt: 2 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  usdt: {
    ethereum: { pyusd: 2, usdc: 2 },
    solana:   { usdb: 2, usdc: 2 },
    tron:     { usdt: 5 },
    polygon:  { usdc: 2 },
    stellar:  { usdc: 2 },
  },
  usdb: {
    ethereum: { usdc: 1, usdt: 20 },
    solana:   { pyusd: 1, usdt: 20 },
    tron:     { usdt: 5 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  pyusd: {
    ethereum: { pyusd: 1 },
    solana:   { usdc: 1, usdt: 20 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  eurc: {
    ethereum: { eurc: 1, usdc: 1 },
    solana:   { eurc: 1, usdb: 1, usdc: 1 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
}

/** Redes de destino disponibles dado un token de origen */
export function getOffRampDestNetworks(sourceCurrency: string | null | undefined): string[] {
  if (!sourceCurrency) return []
  return Object.keys(BRIDGE_RAMP_OFF_ROUTES[sourceCurrency.toLowerCase()] ?? {})
}

/** Tokens de destino disponibles dado token origen + red destino */
export function getOffRampDestCurrencies(sourceCurrency: string | null | undefined, destNetwork: string | null | undefined): string[] {
  if (!sourceCurrency || !destNetwork) return []
  return Object.keys(BRIDGE_RAMP_OFF_ROUTES[sourceCurrency.toLowerCase()]?.[destNetwork.toLowerCase()] ?? {})
}

/** Monto mínimo para una ruta off-ramp completa */
export function getOffRampMinAmount(sourceCurrency: string | null | undefined, destNetwork: string | null | undefined, destCurrency: string | null | undefined): number {
  if (!sourceCurrency || !destNetwork || !destCurrency) return 0
  return BRIDGE_RAMP_OFF_ROUTES[sourceCurrency.toLowerCase()]?.[destNetwork.toLowerCase()]?.[destCurrency.toLowerCase()] ?? 0
}

/** Valida si una combinación off-ramp es soportada por Bridge */
export function isValidOffRampRoute(sourceCurrency: string | null | undefined, destNetwork: string | null | undefined, destCurrency: string | null | undefined): boolean {
  if (!sourceCurrency || !destNetwork || !destCurrency) return false
  return (BRIDGE_RAMP_OFF_ROUTES[sourceCurrency.toLowerCase()]?.[destNetwork.toLowerCase()]?.[destCurrency.toLowerCase()] ?? 0) > 0
}

// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO FIAT_BO OFF-RAMP (bridge_wallet_to_fiat_bo)
//  Subconjunto de BRIDGE_RAMP_OFF_ROUTES filtrado a destinos PSAV
//  posibles (USDC, USDT en Solana).
//
//  EURC excluido (Etapa 1 — requiere validación EUR→BOB)
//  Derivado de lista_bridge_out.md
// ═══════════════════════════════════════════════════════════════════

/** Tokens excluidos para bridge_wallet_to_fiat_bo (Etapa 1) */
export const FIAT_BO_EXCLUDED_SOURCE_CURRENCIES = ['eurc'] as const

/**
 * Rutas off-ramp válidas para bridge_wallet_to_fiat_bo.
 * Solo incluye destinos que pueden existir como PSAV crypto (USDC, USDT).
 * { [source_currency]: { [psav_network]: { [psav_currency]: min_amount } } }
 */
export const FIAT_BO_OFF_RAMP_ROUTES: Record<string, Record<string, Record<string, number>>> = {
  usdc:  { solana: { usdc: 1 } },
  usdt:  { solana: { usdc: 2 } },
  usdb:  { solana: { usdt: 20 } },
  pyusd: { solana: { usdc: 1, usdt: 20 } },
}

/** Tokens de origen válidos para fiat_bo off-ramp */
export const FIAT_BO_OFF_RAMP_SOURCE_CURRENCIES = Object.keys(FIAT_BO_OFF_RAMP_ROUTES) as string[]

/**
 * Mínimo estático de Bridge para un token de origen (sin depender de PSAVs).
 * Útil para validación Zod donde los datos de PSAV no están disponibles.
 * Retorna el menor mínimo posible entre todas las rutas del token.
 */
export function getFiatBoStaticMinAmount(sourceCurrency: string): number {
  const routes = FIAT_BO_OFF_RAMP_ROUTES[sourceCurrency.toLowerCase()]
  if (!routes) return 0
  let min = Infinity
  for (const network of Object.values(routes)) {
    for (const amount of Object.values(network)) {
      if (amount > 0 && amount < min) min = amount
    }
  }
  return min === Infinity ? 0 : min
}

/**
 * Filtra las monedas de origen disponibles para bridge_wallet_to_fiat_bo
 * cruzando el catálogo de rutas Bridge con los PSAV activos.
 *
 * @param psavAccounts — Cuentas PSAV crypto activas (de psavConfigs)
 * @returns Array de tokens origen válidos
 */
export function getFiatBoAvailableSourceCurrencies(
  psavAccounts: Array<{ currency: string; crypto_network?: string; type?: string; is_active?: boolean }>
): string[] {
  // Filtrar solo cuentas crypto activas
  const cryptoPsavs = psavAccounts.filter(
    (p) => (p.type === 'crypto' || !p.type) && (p.is_active !== false)
  )

  return FIAT_BO_OFF_RAMP_SOURCE_CURRENCIES.filter((srcCurrency) => {
    const routes = FIAT_BO_OFF_RAMP_ROUTES[srcCurrency]
    if (!routes) return false
    // ¿Algún PSAV activo tiene match con alguna ruta de este token?
    return cryptoPsavs.some((psav) => {
      const net = (psav.crypto_network ?? '').toLowerCase()
      const cur = psav.currency.toLowerCase()
      return (routes[net]?.[cur] ?? 0) > 0
    })
  })
}

/**
 * Resuelve el monto mínimo para una moneda de origen dada
 * los PSAV activos. Retorna el menor mínimo posible.
 */
export function getFiatBoMinAmountForSource(
  sourceCurrency: string,
  psavAccounts: Array<{ currency: string; crypto_network?: string; type?: string; is_active?: boolean }>
): number {
  const routes = FIAT_BO_OFF_RAMP_ROUTES[sourceCurrency.toLowerCase()]
  if (!routes) return 0

  const cryptoPsavs = psavAccounts.filter(
    (p) => (p.type === 'crypto' || !p.type) && (p.is_active !== false)
  )

  let minFound = Infinity
  for (const psav of cryptoPsavs) {
    const net = (psav.crypto_network ?? '').toLowerCase()
    const cur = psav.currency.toLowerCase()
    const min = routes[net]?.[cur] ?? 0
    if (min > 0 && min < minFound) minFound = min
  }

  return minFound === Infinity ? 0 : minFound
}

