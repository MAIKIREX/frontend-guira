/**
 * CRYPTO_NETWORK_OPTIONS
 *
 * Todos los valores que la API de Bridge acepta en `payment_rail`.
 * Se conserva como referencia completa para resolución de legados.
 */
export const CRYPTO_NETWORK_OPTIONS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'solana',
  'tron',
  'stellar',
  'avalanche_c_chain',
  'celo',
] as const

export type CryptoNetworkOption = (typeof CRYPTO_NETWORK_OPTIONS)[number]

// ── Re-export de la config centralizada de Guira ──────────────────
// Estos son los valores que la UI debe mostrar en dropdowns y validar.
import {
  ALLOWED_NETWORKS,
  NETWORK_LABELS,
  type AllowedNetwork,
  validateCryptoAddress,
  ADDRESS_VALIDATORS,
} from '@/lib/guira-crypto-config'

export {
  ALLOWED_NETWORKS,
  NETWORK_LABELS,
  type AllowedNetwork,
  validateCryptoAddress,
  ADDRESS_VALIDATORS,
}

/**
 * Redes activas en la plataforma (wallet custodial).
 *
 * Este array determina qué redes se muestran en selectores
 * que requieren una wallet custodial (ej: retiros internos).
 * Debe coincidir con las redes configuradas en `SUPPORTED_WALLET_CONFIGS` (app_settings).
 */
export const ACTIVE_CRYPTO_NETWORKS: AllowedNetwork[] = ['solana']

/** Labels legibles para mostrar en la UI */
export const CRYPTO_NETWORK_LABELS: Record<CryptoNetworkOption, string> = {
  ethereum: 'Ethereum (ERC-20)',
  polygon: 'Polygon (MATIC)',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  solana: 'Solana (SOL)',
  tron: 'Tron (TRC-20)',
  stellar: 'Stellar (XLM)',
  avalanche_c_chain: 'Avalanche C-Chain',
  celo: 'Celo',
}

/**
 * Resuelve un valor de red al formato exacto que Bridge acepta.
 * Soporta tanto valores legados con mayúsculas (e.g. "Polygon")
 * como los valores correctos en minúsculas (e.g. "polygon").
 *
 * Nota: Si la red no se reconoce, lanza un error en lugar de
 * silenciosamente asignar un fallback.
 */
export function resolveCryptoNetwork(network?: string): CryptoNetworkOption {
  if (!network) return 'solana'

  const lower = network.toLowerCase()

  // Mapeo de valores legados → valores Bridge
  const legacyMap: Record<string, CryptoNetworkOption> = {
    ethereum: 'ethereum',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
    solana: 'solana',
    tron: 'tron',
    stellar: 'stellar',
    avalanche_c_chain: 'avalanche_c_chain',
    avalanche: 'avalanche_c_chain',
    celo: 'celo',
  }

  const resolved = legacyMap[lower]
  if (!resolved) {
    console.warn(`[resolveCryptoNetwork] Red no reconocida: "${network}", usando "solana" como fallback.`)
    return 'solana'
  }
  return resolved
}
