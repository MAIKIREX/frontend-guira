// ═══════════════════════════════════════════════════════════════════
//  CATÁLOGO DE RUTAS TRANSFER WALLET-TO-WALLET — FRONTEND
//  Réplica del backend: nest-base-backend/src/common/constants/transfer-route-catalog.constants.ts
//
//  Uso: filtrar selects de red/moneda de origen dado el destino del proveedor
//  seleccionado en el flujo crypto_to_crypto (wallet_to_wallet).
//
//  Actualizar en sincronía con el backend al agregar/remover rutas Bridge.
//  Fuente: lista_w_t_w.md
//  Solo rutas same-currency: USDC→USDC y USDT→USDT.
// ═══════════════════════════════════════════════════════════════════

export interface TransferSourceRoute {
  source_network: string;
  source_currency: string;
  min: number;
}

/**
 * Catálogo de rutas soportadas para wallet_to_wallet (Bridge Transfer API).
 * Indexado por { dest_network }->{ dest_currency }->[ sources ].
 * Solo rutas same-currency: USDC→USDC y USDT→USDT.
 */
export const TRANSFER_ROUTE_CATALOG: Record<
  string,
  Record<string, TransferSourceRoute[]>
> = {
  // ─── Destino: Solana / USDC ──────────────────────────────────────
  solana: {
    usdc: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },

  // ─── Destino: Ethereum / USDC ────────────────────────────────────
  ethereum: {
    usdc: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },

  // ─── Destino: Polygon / USDC ─────────────────────────────────────
  polygon: {
    usdc: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },

  // ─── Destino: Stellar / USDC ─────────────────────────────────────
  stellar: {
    usdc: [
      { source_network: 'solana', source_currency: 'usdc', min: 1 },
      { source_network: 'ethereum', source_currency: 'usdc', min: 1 },
      { source_network: 'polygon', source_currency: 'usdc', min: 1 },
      { source_network: 'stellar', source_currency: 'usdc', min: 1 },
    ],
  },

  // ─── Destino: Tron / USDT ────────────────────────────────────────
  tron: {
    usdt: [
      { source_network: 'solana', source_currency: 'usdt', min: 5 },
      { source_network: 'ethereum', source_currency: 'usdt', min: 5 },
      { source_network: 'tron', source_currency: 'usdt', min: 5 },
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
