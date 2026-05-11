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
 * Tokens destino activos para wallet ramp (fiat_bo y crypto).
 * USDB y PYUSD excluidos. EURC visible pero no seleccionable (próximamente).
 */
export const WALLET_RAMP_ACTIVE_DEST_CURRENCIES = ['usdc', 'usdt'] as const

/** Tokens destino visibles pero aún no operativos — se muestran deshabilitados en la UI. */
export const WALLET_RAMP_SOON_DEST_CURRENCIES = ['eurc'] as const

/** Unión de activos + próximamente para renderizar el select completo. */
export const WALLET_RAMP_ALLOWED_DEST_CURRENCIES = [
  ...WALLET_RAMP_ACTIVE_DEST_CURRENCIES,
  ...WALLET_RAMP_SOON_DEST_CURRENCIES,
] as const

/**
 * Tokens destino permitidos para fiat_bo_to_bridge_wallet.
 * Alias de WALLET_RAMP_ACTIVE_DEST_CURRENCIES para compatibilidad.
 */
export const FIAT_BO_ALLOWED_DESTINATION_CURRENCIES = WALLET_RAMP_ACTIVE_DEST_CURRENCIES

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

// ═══════════════════════════════════════════════════════════════════
//  RUTAS ON-RAMP INDEXADAS POR DESTINO — crypto_to_bridge_wallet
//  Fuente: lista_permitida_moneda_origen_destino.md
//
//  Estructura: { [dest_currency]: [{ network, currency, min }, ...] }
//
//  Uso: cuando el usuario ya eligió el token destino (paso 1),
//  esta tabla determina qué redes y monedas de origen son válidas.
// ═══════════════════════════════════════════════════════════════════

export interface AllowedSourceEntry {
  network: string
  currency: string
  min: number
}

/**
 * Combinaciones de origen permitidas por token de destino.
 * Destino siempre Solana (wallet custodial).
 */
export const BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST: Record<string, AllowedSourceEntry[]> = {
  usdc: [
    { network: 'ethereum', currency: 'usdc', min: 1 },
    { network: 'polygon',  currency: 'usdc', min: 1 },
    { network: 'solana',   currency: 'usdc', min: 1 },
    { network: 'stellar',  currency: 'usdc', min: 1 },
  ],
  usdt: [
    { network: 'ethereum', currency: 'usdt', min: 20 },
    { network: 'tron',     currency: 'usdt', min: 20 },
  ],
  usdb: [],
  pyusd: [
    { network: 'ethereum', currency: 'pyusd', min: 1 },
  ],
  eurc: [
    { network: 'ethereum', currency: 'eurc', min: 1 },
    { network: 'solana',   currency: 'eurc', min: 1 },
  ],
}

/** Dado un token destino, retorna las redes de origen disponibles (sin duplicados) */
export function getSourceNetworksForDest(destCurrency: string | null | undefined): string[] {
  if (!destCurrency) return []
  const sources = BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST[destCurrency.toLowerCase()] ?? []
  return [...new Set(sources.map((s) => s.network))]
}

/** Dado un token destino + red de origen, retorna las monedas de origen disponibles */
export function getSourceCurrenciesForDestAndNetwork(
  destCurrency: string | null | undefined,
  sourceNetwork: string | null | undefined,
): string[] {
  if (!destCurrency || !sourceNetwork) return []
  const sources = BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST[destCurrency.toLowerCase()] ?? []
  return sources
    .filter((s) => s.network === sourceNetwork.toLowerCase())
    .map((s) => s.currency)
}

/** Mínimo de transacción dado el token destino, red de origen y moneda de origen */
export function getMinAmountByDest(
  destCurrency: string | null | undefined,
  sourceNetwork: string | null | undefined,
  sourceCurrency: string | null | undefined,
): number {
  if (!destCurrency || !sourceNetwork || !sourceCurrency) return 1
  const sources = BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST[destCurrency.toLowerCase()] ?? []
  const match = sources.find(
    (s) => s.network === sourceNetwork.toLowerCase() && s.currency === sourceCurrency.toLowerCase(),
  )
  return match?.min ?? 1
}

/** Valida si una combinación origen→destino es permitida según el catálogo */
export function isValidOnRampSourceForDest(
  destCurrency: string | null | undefined,
  sourceNetwork: string | null | undefined,
  sourceCurrency: string | null | undefined,
): boolean {
  if (!destCurrency || !sourceNetwork || !sourceCurrency) return false
  const sources = BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST[destCurrency.toLowerCase()] ?? []
  return sources.some(
    (s) => s.network === sourceNetwork.toLowerCase() && s.currency === sourceCurrency.toLowerCase(),
  )
}

/** Tokens destino que tienen al menos una ruta de origen válida */
export function getCryptoDestCurrenciesWithSources(): string[] {
  return Object.entries(BRIDGE_ON_RAMP_ALLOWED_SOURCES_BY_DEST)
    .filter(([, sources]) => sources.length > 0)
    .map(([dest]) => dest)
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
export const OFF_RAMP_SOURCE_CURRENCIES = ['usdc', 'usdt', 'eurc'] as const

/**
 * Catálogo de rutas soportadas para off-ramp bridge_wallet_to_crypto.
 * { [source_currency]: { [dest_network]: { [dest_currency]: min_amount } } }
 */
export const BRIDGE_RAMP_OFF_ROUTES: Record<string, Record<string, Record<string, number>>> = {
  // Source: bridge_wallet (Solana). Multiple destination currencies per network.
  usdc: {
    ethereum: { usdc: 1,  pyusd: 1,  usdt: 20 },
    solana:   { usdc: 1,  eurc: 1,   pyusd: 1, usdb: 1 },
    tron:     { usdt: 2 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  usdt: {
    ethereum: { usdc: 2,  pyusd: 2 },
    solana:   { usdc: 2,  usdb: 2 },
    tron:     { usdt: 5 },
    polygon:  { usdc: 2 },
    stellar:  { usdc: 2 },
  },
  usdb: {
    ethereum: { usdc: 1,  usdt: 20 },
    solana:   { pyusd: 1, usdt: 20 },
    tron:     { usdt: 5 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  pyusd: {
    ethereum: { pyusd: 1 },
    solana:   { usdc: 1,  usdt: 20 },
    polygon:  { usdc: 1 },
    stellar:  { usdc: 1 },
  },
  eurc: {
    ethereum: { usdc: 1,  eurc: 1 },
    solana:   { usdc: 1,  eurc: 1,  usdb: 1 },
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

/** Redes destino donde el mismo token de origen existe como destino (same-token transfer) */
export function getOffRampSameTokenNetworks(sourceCurrency: string | null | undefined): string[] {
  if (!sourceCurrency) return []
  const cur = sourceCurrency.toLowerCase()
  const networks = BRIDGE_RAMP_OFF_ROUTES[cur] ?? {}
  return Object.keys(networks).filter((net) => cur in networks[net])
}

/** Retorna [sourceCurrency] si ese mismo token está disponible como destino en la red dada, o [] si no */
export function getOffRampSameTokenDestCurrencies(
  sourceCurrency: string | null | undefined,
  destNetwork: string | null | undefined,
): string[] {
  if (!sourceCurrency || !destNetwork) return []
  const cur = sourceCurrency.toLowerCase()
  const dests = BRIDGE_RAMP_OFF_ROUTES[cur]?.[destNetwork.toLowerCase()] ?? {}
  return cur in dests ? [cur] : []
}

// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO FIAT_BO OFF-RAMP (bridge_wallet_to_fiat_bo)
//  Match estricto mismo token: USDT→PSAV USDT, USDC→PSAV USDC.
//  Si no hay cuenta PSAV activa con esa divisa, el token no aparece.
// ═══════════════════════════════════════════════════════════════════

/** Tokens próximamente disponibles para off-ramp (se muestran en UI pero no son seleccionables) */
export const COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES = ['eurc'] as const

/**
 * Rutas off-ramp válidas para bridge_wallet_to_fiat_bo.
 * Match estricto: source_currency == psav.currency.
 * { [source_currency]: { [psav_network]: { [psav_currency]: min_amount } } }
 */
export const FIAT_BO_OFF_RAMP_ROUTES: Record<string, Record<string, Record<string, number>>> = {
  usdc: { solana: { usdc: 1 } },
  usdt: { tron:   { usdt: 5 } },
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
 * cruzando el catálogo con los PSAV activos. Match estricto: solo se
 * incluye un token si existe una cuenta PSAV activa con esa misma divisa.
 *
 * @param psavAccounts — Cuentas PSAV crypto activas
 * @returns Array de tokens origen habilitados
 */
export function getFiatBoAvailableSourceCurrencies(
  psavAccounts: Array<{ currency: string; crypto_network?: string; type?: string; is_active?: boolean }>
): string[] {
  const cryptoPsavs = psavAccounts.filter(
    (p) => (p.type === 'crypto' || !p.type) && (p.is_active !== false)
  )

  return FIAT_BO_OFF_RAMP_SOURCE_CURRENCIES.filter((srcCurrency) => {
    const routes = FIAT_BO_OFF_RAMP_ROUTES[srcCurrency]
    if (!routes) return false
    // Buscar cuenta PSAV con exactamente la misma divisa
    return cryptoPsavs.some((psav) => {
      const net = (psav.crypto_network ?? '').toLowerCase()
      const cur = psav.currency.toLowerCase()
      return cur === srcCurrency && (routes[net]?.[cur] ?? 0) > 0
    })
  })
}

/**
 * Resuelve el monto mínimo para una moneda de origen dada los PSAV activos.
 * Solo considera la cuenta PSAV con la misma divisa (match estricto).
 */
export function getFiatBoMinAmountForSource(
  sourceCurrency: string,
  psavAccounts: Array<{ currency: string; crypto_network?: string; type?: string; is_active?: boolean }>
): number {
  const srcLower = sourceCurrency.toLowerCase()
  const routes = FIAT_BO_OFF_RAMP_ROUTES[srcLower]
  if (!routes) return 0

  const cryptoPsavs = psavAccounts.filter(
    (p) => (p.type === 'crypto' || !p.type) && (p.is_active !== false)
  )

  const psav = cryptoPsavs.find((p) => p.currency.toLowerCase() === srcLower)
  if (!psav) return 0

  const net = (psav.crypto_network ?? '').toLowerCase()
  return routes[net]?.[srcLower] ?? 0
}

