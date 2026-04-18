// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO DE RUTAS SOPORTADAS POR BRIDGE — ETAPA 1
//  Fuente: lista.md (documentación Bridge, filtrada a destino Solana)
//
//  Estructura: { [red_origen]: { [moneda_origen]: { destinations, min } } }
//
//  Reglas aplicadas:
//  - Solo destino Solana (wallet custodial actual)
//  - Solo tokens destino en ALLOWED_CRYPTO_CURRENCIES
//  - Solo tokens origen en ALLOWED_CRYPTO_CURRENCIES
//  - EURC excluido de fiat_bo_to_bridge_wallet (requiere tasa BOB_EUR)
//
//  El backend tiene su réplica en:
//  nest-base-backend/src/common/constants/bridge-route-catalog.constants.ts
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
