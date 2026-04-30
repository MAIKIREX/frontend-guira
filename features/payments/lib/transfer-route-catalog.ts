// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO DE RUTAS TRANSFER WALLET-TO-WALLET — FRONTEND
//  Réplica del backend: nest-base-backend/src/common/constants/transfer-route-catalog.constants.ts
//
//  Uso: filtrar selects de red/moneda de origen dado el destino del proveedor
//  seleccionado en el flujo crypto_to_crypto (wallet_to_wallet).
//
//  Actualizar en sincronía con el backend al agregar/remover rutas Bridge.
// ═══════════════════════════════════════════════════════════════════

export interface TransferSourceRoute {
  source_network: string;
  source_currency: string;
  min: number;
}

/**
 * Catálogo de rutas soportadas para wallet_to_wallet (Bridge Transfer API).
 * Indexado por { dest_network }->{ dest_currency }->[ sources ].
 */
export const TRANSFER_ROUTE_CATALOG: Record<
  string,
  Record<string, TransferSourceRoute[]>
> = {
  // ─── Destino: Ethereum ───────────────────────────────────────────
  ethereum: {
    eurc: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'usdb', min: 1 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 2 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'polygon', source_currency: 'usdc', min: 2 },
      { source_network: 'stellar', source_currency: 'usdc', min: 2 },
    ],
    usdc: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'pyusd', min: 1 },
      { source_network: 'solana', source_currency: 'usdb', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'solana', source_currency: 'usdt', min: 2 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
    pyusd: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'solana', source_currency: 'usdt', min: 2 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
    usdt: [
      { source_network: 'solana', source_currency: 'usdb', min: 20 },
      { source_network: 'solana', source_currency: 'usdc', min: 20 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 20 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 20 },
      { source_network: 'tron', source_currency: 'usdt', min: 20 },
      { source_network: 'polygon', source_currency: 'usdc', min: 20 },
      { source_network: 'stellar', source_currency: 'usdc', min: 20 },
    ],
  },

  // ─── Destino: Solana ─────────────────────────────────────────────
  solana: {
    eurc: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 2 },
      { source_network: 'polygon', source_currency: 'usdc', min: 2 },
      { source_network: 'stellar', source_currency: 'usdc', min: 2 },
    ],
    pyusd: [
      { source_network: 'solana', source_currency: 'usdb', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
    usdb: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
    usdc: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'pyusd', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'solana', source_currency: 'usdt', min: 2 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
    usdt: [
      { source_network: 'solana', source_currency: 'pyusd', min: 20 },
      { source_network: 'solana', source_currency: 'usdb', min: 20 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 20 },
      { source_network: 'tron', source_currency: 'usdt', min: 20 },
      { source_network: 'polygon', source_currency: 'usdc', min: 20 },
      { source_network: 'stellar', source_currency: 'usdc', min: 20 },
    ],
  },

  // ─── Destino: Tron ───────────────────────────────────────────────
  tron: {
    usdt: [
      { source_network: 'solana', source_currency: 'usdb', min: 5 },
      { source_network: 'solana', source_currency: 'usdc', min: 2 },
      { source_network: 'solana', source_currency: 'usdt', min: 5 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 5 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 5 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 5 },
      { source_network: 'stellar', source_currency: 'usdc', min: 5 },
    ],
  },

  // ─── Destino: Polygon ────────────────────────────────────────────
  polygon: {
    usdc: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'pyusd', min: 1 },
      { source_network: 'solana', source_currency: 'usdb', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'solana', source_currency: 'usdt', min: 2 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },

  // ─── Destino: Stellar ────────────────────────────────────────────
  stellar: {
    usdc: [
      { source_network: 'solana', source_currency: 'eurc', min: 1 },
      { source_network: 'solana', source_currency: 'pyusd', min: 1 },
      { source_network: 'solana', source_currency: 'usdb', min: 1 },
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'solana', source_currency: 'usdt', min: 2 },
      { source_network: 'ethereum', source_currency: 'eurc', min: 1 },
      { source_network: 'ethereum', source_currency: 'pyusd', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 2 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Dado un destino (red + moneda), retorna las fuentes válidas con sus mínimos.
 */
export function getValidSourceRoutes(
  destNetwork: string,
  destCurrency: string,
): TransferSourceRoute[] {
  return (
    TRANSFER_ROUTE_CATALOG[destNetwork.toLowerCase()]?.[
      destCurrency.toLowerCase()
    ] ?? []
  );
}

/**
 * Redes de origen únicas disponibles para un destino dado.
 */
export function getAvailableSourceNetworks(
  destNetwork: string,
  destCurrency: string,
): string[] {
  const sources = getValidSourceRoutes(destNetwork, destCurrency);
  return [...new Set(sources.map((s) => s.source_network))];
}

/**
 * Monedas de origen disponibles para una combinación de destino + red origen.
 */
export function getAvailableSourceCurrencies(
  destNetwork: string,
  destCurrency: string,
  srcNetwork: string,
): string[] {
  const sources = getValidSourceRoutes(destNetwork, destCurrency);
  return sources
    .filter((s) => s.source_network === srcNetwork.toLowerCase())
    .map((s) => s.source_currency);
}

/**
 * Valida si una combinación completa origen→destino es soportada.
 */
export function isValidTransferRoute(
  srcNetwork: string,
  srcCurrency: string,
  dstNetwork: string,
  dstCurrency: string,
): boolean {
  const sources = getValidSourceRoutes(dstNetwork, dstCurrency);
  return sources.some(
    (s) =>
      s.source_network === srcNetwork.toLowerCase() &&
      s.source_currency === srcCurrency.toLowerCase(),
  );
}

/**
 * Monto mínimo para una ruta dada. Retorna 0 si no existe.
 */
export function getTransferMinAmount(
  srcNetwork: string,
  srcCurrency: string,
  dstNetwork: string,
  dstCurrency: string,
): number {
  const sources = getValidSourceRoutes(dstNetwork, dstCurrency);
  const route = sources.find(
    (s) =>
      s.source_network === srcNetwork.toLowerCase() &&
      s.source_currency === srcCurrency.toLowerCase(),
  );
  return route?.min ?? 0;
}
