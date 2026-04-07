'use client'

import { useEffect, useState, useCallback } from 'react'
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
  polygon:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  stellar:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  solana:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tron:      'bg-red-500/10 text-red-400 border-red-500/20',
  avalanche: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  base:      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

function truncateAddress(address: string, chars = 8): string {
  if (!address || address.length <= chars * 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
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

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card transition-shadow hover:shadow-md">

      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background:
            'radial-gradient(ellipse at top right, currentColor 0%, transparent 70%)',
        }}
      />

      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              {wallet.label ?? `${wallet.currency.toUpperCase()} Wallet`}
            </CardTitle>
            <CardDescription className="text-xs">
              Proveedor: <span className="font-medium capitalize">{wallet.provider}</span>
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-medium ${networkColor}`}
          >
            {networkLabel}
          </Badge>
          {wallet.is_active ? (
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px]">
              Activa
            </Badge>
          ) : (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[11px]">
              Inactiva
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balances */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {(wallet.balance ?? 0).toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{wallet.currency?.toUpperCase()}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Disponible</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">
              {(wallet.available_balance ?? 0).toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{wallet.currency?.toUpperCase()}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reservado</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-400">
              {(wallet.reserved_balance ?? 0).toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{wallet.currency?.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Dirección blockchain */}
        {wallet.address && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Dirección {networkLabel}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-foreground/80">
                {truncateAddress(wallet.address, 10)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-foreground"
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
                href={`https://etherscan.io/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver en explorador"
                className="inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        <Card className="border-dashed border-border/60">
          <CardContent className="flex min-h-[16vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <Wallet className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No hay wallets aún</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isApproved
                  ? 'Tus wallets se están aprovisionando. Vuelve en unos momentos.'
                  : 'Completa la verificación KYC/KYB para activar tus wallets.'}
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
    <div className="space-y-6">
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
        <TabsList>
          <TabsTrigger value="wallets">
            <Wallet className="size-3.5" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="virtual-accounts">
            <Landmark className="size-3.5" />
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
