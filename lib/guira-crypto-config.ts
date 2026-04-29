// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN CRYPTO GUIRA — ETAPA 1
//  Fuente única de verdad para redes blockchain, monedas crypto
//  y validación de direcciones en el frontend.
//
//  El backend tiene su réplica en:
//  nest-base-backend/src/common/constants/guira-crypto-config.constants.ts
// ═══════════════════════════════════════════════════════════════════

// ── REDES PERMITIDAS (Etapa 1) ──────────────────────────────────
// 6 redes habilitadas para transfers, VA, proveedores, etc.
// La wallet custodial es solo Solana por ahora (definido en app_settings).
export const ALLOWED_NETWORKS = [
  'base',
  'ethereum',
  'solana',
  'tron',
  'polygon',
  'stellar',
] as const;
export type AllowedNetwork = (typeof ALLOWED_NETWORKS)[number];

// ── MONEDAS CRYPTO PERMITIDAS (Etapa 1) ─────────────────────────
export const ALLOWED_CRYPTO_CURRENCIES = [
  'usdb',
  'usdc',
  'usdt',
  'pyusd',
  'eurc',
] as const;
export type AllowedCryptoCurrency = (typeof ALLOWED_CRYPTO_CURRENCIES)[number];

// ── MONEDAS FIAT SOPORTADAS ─────────────────────────────────────
export const ALLOWED_FIAT_CURRENCIES = [
  'usd',
  'eur',
  'mxn',
  'brl',
  'gbp',
  'cop',
] as const;
export type AllowedFiatCurrency = (typeof ALLOWED_FIAT_CURRENCIES)[number];

// ── LABELS PARA UI ──────────────────────────────────────────────
export const NETWORK_LABELS: Record<AllowedNetwork, string> = {
  base: 'Base',
  ethereum: 'Ethereum (ERC-20)',
  solana: 'Solana (SOL)',
  tron: 'Tron (TRC-20)',
  polygon: 'Polygon (MATIC)',
  stellar: 'Stellar (XLM)',
};

export const CRYPTO_CURRENCY_LABELS: Record<AllowedCryptoCurrency, string> = {
  usdb: 'USDB',
  usdc: 'USDC',
  usdt: 'USDT',
  pyusd: 'PYUSD',
  eurc: 'EURC',
};

// ── TOKENS VÁLIDOS POR RED ───────────────────────────────────────
export const NETWORK_TOKEN_MAP: Record<AllowedNetwork, readonly AllowedCryptoCurrency[]> = {
  base:     ['usdc'],
  ethereum: ['pyusd', 'usdc'],
  solana:   ['usdb', 'usdc'],
  tron:     ['usdt'],
  polygon:  ['usdc'],
  stellar:  ['usdc'],
};

// ── VALIDACIÓN DE DIRECCIONES POR RED ───────────────────────────
export const ADDRESS_VALIDATORS: Record<
  AllowedNetwork,
  { regex: RegExp; description: string }
> = {
  ethereum: { regex: /^0x[0-9a-fA-F]{40}$/, description: '0x + 40 hex chars' },
  polygon: {
    regex: /^0x[0-9a-fA-F]{40}$/,
    description: '0x + 40 hex chars (EVM)',
  },
  base: {
    regex: /^0x[0-9a-fA-F]{40}$/,
    description: '0x + 40 hex chars (EVM)',
  },
  solana: {
    regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    description: 'Base58, 32-44 chars',
  },
  tron: {
    regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    description: 'T + 33 chars Base58',
  },
  stellar: { regex: /^G[A-Z2-7]{55}$/, description: 'G + 55 chars' },
};

/**
 * Valida una dirección blockchain según la red seleccionada.
 * @returns true si la dirección es válida para la red, false si no.
 */
export function validateCryptoAddress(
  address: string,
  network: AllowedNetwork,
): boolean {
  const validator = ADDRESS_VALIDATORS[network];
  if (!validator) return false;
  return validator.regex.test(address.trim());
}

/**
 * Verifica que una red está en la whitelist de Etapa 1.
 */
export function isAllowedNetwork(
  network: string,
): network is AllowedNetwork {
  return (ALLOWED_NETWORKS as readonly string[]).includes(
    network.toLowerCase(),
  );
}

/**
 * Verifica que una moneda crypto está en la whitelist de Etapa 1.
 */
export function isAllowedCryptoCurrency(
  currency: string,
): currency is AllowedCryptoCurrency {
  return (ALLOWED_CRYPTO_CURRENCIES as readonly string[]).includes(
    currency.toLowerCase(),
  );
}
