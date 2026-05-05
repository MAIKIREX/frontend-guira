// ═══════════════════════════════════════════════════════════════════
//  MAPA DE RIELES CRYPTO SOPORTADOS — WALLET-TO-WALLET
//  Fuente: lista_w_t_w.md
//
//  Indexado por "{dest_network}_{DEST_CURRENCY}" → sources válidos.
//  Usado por la UI para filtrar los selects de red/moneda de origen
//  dado el destino del proveedor seleccionado.
//
//  Solo rutas same-currency: USDC→USDC y USDT→USDT.
// ═══════════════════════════════════════════════════════════════════

export const cryptoRailMapping: Record<string, Array<{ network: string; currency: string }>> = {
  // ─── Destino: Solana / USDC ──────────────────────────────────────
  "solana_USDC": [
    { "network": "solana", "currency": "USDC" },
    { "network": "ethereum", "currency": "USDC" },
    { "network": "polygon", "currency": "USDC" },
    { "network": "stellar", "currency": "USDC" },
  ],

  // ─── Destino: Ethereum / USDC ────────────────────────────────────
  "ethereum_USDC": [
    { "network": "solana", "currency": "USDC" },
    { "network": "polygon", "currency": "USDC" },
    { "network": "stellar", "currency": "USDC" },
  ],

  // ─── Destino: Polygon / USDC ─────────────────────────────────────
  "polygon_USDC": [
    { "network": "solana", "currency": "USDC" },
    { "network": "ethereum", "currency": "USDC" },
    { "network": "stellar", "currency": "USDC" },
  ],

  // ─── Destino: Stellar / USDC ─────────────────────────────────────
  "stellar_USDC": [
    { "network": "solana", "currency": "USDC" },
    { "network": "ethereum", "currency": "USDC" },
    { "network": "polygon", "currency": "USDC" },
    { "network": "stellar", "currency": "USDC" },
  ],

  // ─── Destino: Tron / USDT ────────────────────────────────────────
  "tron_USDT": [
    { "network": "solana", "currency": "USDT" },
    { "network": "ethereum", "currency": "USDT" },
    { "network": "tron", "currency": "USDT" },
  ],
};

export function getSupportedSourceCrypto(destNetwork: string, destCurrency: string): Array<{ network: string; currency: string }> {
  const key = `${destNetwork.toLowerCase()}_${destCurrency.toUpperCase()}`;
  return cryptoRailMapping[key] || [];
}
