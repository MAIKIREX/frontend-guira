/**
 * CRYPTO_NETWORK_OPTIONS
 *
 * Valores exactos que acepta la API de Bridge en los campos
 * `payment_rail` para source y destination.
 *
 * Refs: BridgeWalletSepaSwiftInclusivePaymentRail /
 *       SepaSwiftInclusivePaymentRail (OpenAPI spec transfer.md)
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
 */
export function resolveCryptoNetwork(network?: string): CryptoNetworkOption {
  if (!network) return 'polygon'

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
    bsc: 'ethereum', // BSC no soportado por Bridge, fallback a ethereum
    stellar: 'stellar',
    avalanche_c_chain: 'avalanche_c_chain',
    avalanche: 'avalanche_c_chain',
    celo: 'celo',
  }

  return legacyMap[lower] ?? 'polygon'
}
