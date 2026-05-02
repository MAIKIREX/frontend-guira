'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Wallet,
  CheckCheck,
  Landmark,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProfileStore } from '@/stores/profile-store'
import { WalletService, type WalletBalance } from '@/services/wallet.service'
import { createClient } from '@/lib/supabase/browser'
import { VirtualAccountsSection } from './virtual-accounts-section'

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon:  'Polygon',
  stellar:  'Stellar',
  solana:   'Solana',
  tron:     'TRON',
  avalanche: 'Avalanche',
  base:     'Base',
}

const NETWORK_COLORS: Record<string, string> = {
  ethereum:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  polygon:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  stellar:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  solana:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tron:      'bg-red-500/10 text-red-400 border-red-500/20',
  avalanche: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  base:      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

const NETWORK_GRADIENTS: Record<string, string> = {
  ethereum:  'from-blue-500/15 via-background to-background',
  polygon:   'from-blue-500/15 via-background to-background',
  stellar:   'from-sky-500/15 via-background to-background',
  solana:    'from-emerald-500/15 via-background to-background',
  tron:      'from-red-500/15 via-background to-background',
  avalanche: 'from-rose-500/15 via-background to-background',
  base:      'from-indigo-500/15 via-background to-background',
}

function truncateAddress(address: string, chars = 8): string {
  if (!address || address.length <= chars * 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

const EXPLORER_URLS: Record<string, string> = {
  ethereum:  'https://etherscan.io/address/',
  polygon:   'https://polygonscan.com/address/',
  solana:    'https://solscan.io/account/',
  tron:      'https://tronscan.org/#/address/',
  avalanche: 'https://snowtrace.io/address/',
  base:      'https://basescan.org/address/',
  stellar:   'https://stellar.expert/explorer/public/account/',
}

const EXPLORER_NAMES: Record<string, string> = {
  ethereum:  'Etherscan',
  polygon:   'PolygonScan',
  solana:    'Solscan',
  tron:      'TronScan',
  avalanche: 'Snowtrace',
  base:      'BaseScan',
  stellar:   'Stellar Expert',
}

function getExplorerUrl(network: string, address: string): string {
  const base = EXPLORER_URLS[network] ?? EXPLORER_URLS.ethereum
  return `${base}${address}`
}

/** Labels para los tokens / stablecoins */
const TOKEN_LABELS: Record<string, string> = {
  USDC: 'USD Coin',
  USDT: 'Tether',
  USDB: 'Bridge USD',
  PYUSD: 'PayPal USD',
  EURC: 'Euro Coin',
  USD: 'Dólar (fiat)',
}

/** Colores por token para los indicadores visuales */
const TOKEN_COLORS: Record<string, string> = {
  USDC: 'bg-blue-500',
  USDT: 'bg-emerald-500',
  USDB: 'bg-blue-500',
  PYUSD: 'bg-sky-500',
  EURC: 'bg-amber-500',
  USD: 'bg-green-500',
}

function WalletCard({ wallet }: { wallet: WalletBalance }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const addr = wallet.address ?? ''
    if (!addr) return
    try {
      await navigator.clipboard.writeText(addr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [wallet.address])

  const networkLabel = NETWORK_LABELS[wallet.network ?? ''] ?? wallet.network ?? 'Interna'
  const networkColor = NETWORK_COLORS[wallet.network ?? ''] ?? 'bg-muted text-muted-foreground border-border/50'
  const networkGradient = NETWORK_GRADIENTS[wallet.network ?? ''] ?? 'from-muted/20 via-background to-background'

  const hasMultipleTokens = wallet.token_balances && wallet.token_balances.length > 1

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br ${networkGradient} border-border/40`}>
      {/* Fondo decorativo de cristal */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-md">
            <Wallet className="size-4 text-foreground/80" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight">
              {wallet.label ?? `Wallet ${networkLabel}`}
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              <span className="capitalize">{wallet.provider}</span>
              {hasMultipleTokens && (
                <span className="ml-1.5 text-muted-foreground/60">· {wallet.token_balances.length} tokens</span>
              )}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] font-medium uppercase tracking-wider ${networkColor}`}
          >
            {networkLabel}
          </Badge>
          {wallet.is_active && (
            <div className="flex items-center gap-1.5 px-1 pr-0">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">Activa</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-2 space-y-5">
        {/* Balance total (agregado) */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {hasMultipleTokens ? 'Balance Total Disponible' : 'Balance Disponible'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter text-foreground">
              {(wallet.available_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg font-bold text-muted-foreground">
              USD
            </span>
          </div>
          {(wallet.reserved_balance ?? 0) > 0 && (
             <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-500/90">
               Total en cuenta: {(wallet.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
               <span className="text-muted-foreground/50">|</span> 
               Retenido: {(wallet.reserved_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
             </p>
          )}
        </div>

        {/* Desglose de tokens (solo si es multi-token) */}
        {hasMultipleTokens && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Desglose por Token
            </p>
            <div className="space-y-1">
              {wallet.token_balances.map((token) => {
                const hasBalance = (token.available_balance ?? 0) > 0
                const tokenColor = TOKEN_COLORS[token.currency] ?? 'bg-gray-500'
                return (
                  <div
                    key={token.currency}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                      hasBalance
                        ? 'bg-background/60 border border-border/30'
                        : 'bg-background/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-block size-2 rounded-full ${tokenColor}`} />
                      <div>
                        <span className="text-xs font-bold tracking-tight text-foreground">
                          {token.currency}
                        </span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                          {TOKEN_LABELS[token.currency] ?? ''}
                        </span>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-semibold tabular-nums ${hasBalance ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {(token.available_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Dirección blockchain */}
        {wallet.address && (
          <div className="group/address -mx-6 -mb-6 mt-4 flex items-center justify-between gap-3 border-t border-border/20 bg-background/40 px-6 py-3 backdrop-blur-sm transition-colors hover:bg-background/60">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors group-hover/address:text-foreground/70">
                Dirección {networkLabel}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs font-medium text-foreground/50 transition-colors group-hover/address:text-foreground/90">
                {truncateAddress(wallet.address, 12)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/address:opacity-100">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 bg-background/50 border border-border/30 text-foreground/70 shadow-sm hover:bg-background hover:text-foreground"
                onClick={handleCopy}
                title="Copiar dirección"
              >
                {copied ? (
                  <CheckCheck className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              <a
                href={getExplorerUrl(wallet.network ?? 'solana', wallet.address)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ver en ${EXPLORER_NAMES[wallet.network ?? ''] ?? 'explorador'}`}
                className="inline-flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-foreground/70 shadow-sm transition-colors hover:bg-background hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Wallets Section (extracted) ──────────────────────────────────

function WalletsSection({ isApproved }: { isApproved: boolean }) {
  const [wallets, setWallets] = useState<WalletBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await WalletService.getWallets()
      setWallets(data ?? [])
    } catch (err) {
      setError((err as Error)?.message ?? 'No se pudieron cargar las cuentas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ── Supabase Realtime: auto-refresh when balance changes ──
  const { profile } = useProfileStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`wallets-live:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balances', filter: `user_id=eq.${userId}` },
        () => { void load() }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, load])

  return (
    <div className="space-y-5">
      {/* Sub-header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Wallets</p>
            <p className="text-xs text-muted-foreground">
              Balances y direcciones blockchain asociadas a tu cuenta
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void load()}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Error al cargar cuentas</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && wallets.length === 0 && (
        <Card className="border-dashed border-border/40 bg-muted/10 mx-auto max-w-2xl mt-8">
          <CardContent className="flex min-h-[28vh] flex-col items-center justify-center gap-5 text-center px-4 py-12">
            <div className="relative flex size-16 items-center justify-center rounded-full border border-border bg-background shadow-sm ring-4 ring-muted/50">
              <Wallet className="size-6 text-muted-foreground/50" />
            </div>
            <div className="max-w-sm">
              <p className="text-lg font-semibold tracking-tight text-foreground">No hay wallets activas</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {isApproved
                  ? 'Tus wallets se están aprovisionando en nuestra infraestructura blockchain de alta seguridad. Aparecerán aquí en unos instantes.'
                  : 'Para mantener la seguridad de nuestra plataforma, completa tu verificación KYC/KYB para habilitar tus bóvedas y billeteras.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {!loading && !error && wallets.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && wallets.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground/60">
          Las wallets son administradas por Bridge y respaldadas por activos digitales reales.
          Los balances se actualizan en tiempo real mediante webhooks.
        </p>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────

export function MyAccountsPage() {
  const { profile } = useProfileStore()
  const isApproved = profile?.onboarding_status === 'approved'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Cuenta Guira
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Mis Cuentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wallets, balances y cuentas virtuales para recibir depósitos bancarios.
        </p>
      </div>

      {/* Alerta si no está verificado */}
      {!isApproved && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-foreground">Verificación pendiente</p>
            <p className="mt-0.5 text-muted-foreground">
              Las wallets y cuentas virtuales se activan al aprobar tu verificación KYC/KYB. 
              Completa el proceso de onboarding para activar tu cuenta.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="wallets">
        <TabsList className="mb-4 h-14 rounded-full bg-muted/50 p-1">
          <TabsTrigger 
            value="wallets" 
            className="h-full rounded-full px-8 text-base font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
          >
            <Wallet className="mr-2.5 size-5" />
            Wallets
          </TabsTrigger>
          <TabsTrigger 
            value="virtual-accounts"
            className="h-full rounded-full px-8 text-base font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
          >
            <Landmark className="mr-2.5 size-5" />
            Cuentas Virtuales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="pt-4">
          <WalletsSection isApproved={isApproved} />
        </TabsContent>

        <TabsContent value="virtual-accounts" className="pt-4">
          <VirtualAccountsSection isApproved={isApproved} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
