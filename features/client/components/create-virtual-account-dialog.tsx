'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { validateCryptoAddress, isAllowedNetwork } from '@/lib/guira-crypto-config'
import {
  Loader2,
  Plus,
  Landmark,
  Globe,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BridgeService,
  SOURCE_CURRENCY_OPTIONS,
  DESTINATION_CURRENCY_OPTIONS,
  DESTINATION_RAIL_OPTIONS,
  type SourceCurrency,
  type DestinationCurrency,
  type DestinationRail,
  type VirtualAccount,
  type CreateVirtualAccountDto,
} from '@/services/bridge.service'
import { WalletService, type WalletBalance } from '@/services/wallet.service'

// ── Types ────────────────────────────────────────────────────────

type DestinationType = 'internal' | 'external'

/** Límite por defecto de VAs externas por moneda (debe coincidir con VA_MAX_EXTERNAL_PER_CURRENCY en backend) */
const DEFAULT_MAX_EXTERNAL_PER_CURRENCY = 3

interface CreateVirtualAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Monedas que ya tienen una VA interna (Bridge) activa */
  internalCurrencies: SourceCurrency[]
  /** Conteo de VAs externas existentes por moneda origen */
  externalCountBySource: Record<string, number>
  onCreated: (va: VirtualAccount) => void
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Validación de formato de dirección blockchain.
 * Usa los validadores centralizados de guira-crypto-config cuando la red es conocida.
 * Cuando no hay red específica, realiza validación genérica.
 */
function isValidBlockchainAddress(address: string, network?: string): boolean {
  const trimmed = address.trim()
  if (trimmed.length < 10) return false

  // Si tenemos red específica y es una red permitida, usar validador centralizado
  if (network && isAllowedNetwork(network)) {
    return validateCryptoAddress(trimmed, network as any)
  }

  // Fallback genérico: acepta cualquiera de los formatos conocidos
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return true
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return true
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)) return true
  if (/^G[A-Z2-7]{55}$/.test(trimmed)) return true

  return trimmed.length >= 26 && trimmed.length <= 256
}

// ── Component ────────────────────────────────────────────────────

export function CreateVirtualAccountDialog({
  open,
  onOpenChange,
  internalCurrencies,
  externalCountBySource,
  onCreated,
}: CreateVirtualAccountDialogProps) {
  // Form state — destino se elige PRIMERO (Hallazgo 2)
  const [destType, setDestType] = useState<DestinationType>('internal')
  const [sourceCurrency, setSourceCurrency] = useState<SourceCurrency | ''>('')
  const [destCurrency, setDestCurrency] = useState<DestinationCurrency | ''>('')
  const [destRail, setDestRail] = useState<DestinationRail | ''>('')
  const [destWalletId, setDestWalletId] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [destLabel, setDestLabel] = useState('')

  // Data
  const [wallets, setWallets] = useState<WalletBalance[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressTouched, setAddressTouched] = useState(false)

  // Load user wallets for internal destination
  useEffect(() => {
    if (!open) return
    setWalletsLoading(true)
    WalletService.getWallets()
      .then((data) => {
        const active = (data ?? []).filter((w) => w.is_active)
        setWallets(active)
        if (active.length > 0 && !destWalletId) {
          setDestWalletId(active[0].id)
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setWalletsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setDestType('internal')
      setSourceCurrency('')
      setDestCurrency('')
      setDestRail('')
      setDestWalletId('')
      setDestAddress('')
      setDestLabel('')
      setError(null)
      setAddressTouched(false)
    }
  }, [open])

  // Reset source currency when destination type changes (Hallazgo 1)
  useEffect(() => {
    setSourceCurrency('')
  }, [destType])

  // Auto-fill currency and network when internal wallet changes
  useEffect(() => {
    if (destType === 'internal' && destWalletId && wallets.length > 0) {
      const selectedWallet = wallets.find((w) => w.id === destWalletId)
      if (selectedWallet) {
        const walletCurrency = selectedWallet.currency.toLowerCase()
        const isCurrencyValid = DESTINATION_CURRENCY_OPTIONS.some(c => c.value === walletCurrency)
        if (isCurrencyValid) {
          setDestCurrency(walletCurrency as DestinationCurrency)
        }

        if (selectedWallet.network) {
          const walletNetwork = selectedWallet.network.toLowerCase()
          const isNetworkValid = DESTINATION_RAIL_OPTIONS.some(r => r.value === walletNetwork)
          if (isNetworkValid) {
            setDestRail(walletNetwork as DestinationRail)
          }
        }
      }
    }
  }, [destType, destWalletId, wallets])

  // ── Filtrado dinámico de monedas según destType (Hallazgo 1) ──

  const availableCurrencies = useMemo(() => {
    if (destType === 'internal') {
      // Para destino interno: filtrar monedas que ya tienen VA interna
      return SOURCE_CURRENCY_OPTIONS.filter(
        (o) => !internalCurrencies.includes(o.value)
      )
    }
    // Para destino externo: todas las monedas están disponibles
    // (el backend valida el límite por moneda: VA_MAX_EXTERNAL_PER_CURRENCY)
    return SOURCE_CURRENCY_OPTIONS
  }, [destType, internalCurrencies])

  // Verificar si la moneda seleccionada alcanzó el límite de VAs externas
  const externalLimitReached = destType === 'external' && sourceCurrency !== ''
    ? (externalCountBySource[sourceCurrency] ?? 0) >= DEFAULT_MAX_EXTERNAL_PER_CURRENCY
    : false

  // Validar dirección blockchain (Hallazgo 6)
  const addressValid = destAddress.trim().length === 0 || isValidBlockchainAddress(destAddress)
  const showAddressError = addressTouched && destAddress.trim().length > 0 && !addressValid

  const isValid =
    sourceCurrency !== '' &&
    destCurrency !== '' &&
    destRail !== '' &&
    !externalLimitReached &&
    (destType === 'internal'
      ? !!destWalletId
      : destAddress.trim().length > 0 && addressValid)

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const dto: CreateVirtualAccountDto = {
        source_currency: sourceCurrency as SourceCurrency,
        destination_currency: destCurrency as DestinationCurrency,
        destination_payment_rail: destRail as DestinationRail,
      }

      if (destType === 'internal') {
        dto.destination_wallet_id = destWalletId
      } else {
        dto.destination_address = destAddress.trim()
        if (destLabel.trim()) {
          dto.destination_label = destLabel.trim()
        }
      }

      const created = await BridgeService.createVirtualAccount(dto)
      onCreated(created)
      onOpenChange(false)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? 'Error al crear la cuenta virtual'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }, [isValid, submitting, sourceCurrency, destCurrency, destRail, destType, destWalletId, destAddress, destLabel, onCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="group flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-semibold tracking-wide text-primary-foreground shadow-sm transition-all duration-200 ease-in-out hover:bg-primary/90 hover:shadow-md">
        <Plus className="size-4" />
        <span>Crear cuenta virtual</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear cuenta virtual</DialogTitle>
          <DialogDescription>
            Genera una cuenta bancaria virtual para recibir depósitos. Los fondos se convertirán automáticamente a la criptomoneda elegida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── PASO 1: Tipo de destino (ANTES de moneda — Hallazgo 2) ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              ¿Dónde recibir los fondos convertidos?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestType('internal')}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                  destType === 'internal'
                    ? 'border-primary/50 bg-primary/5 text-primary'
                    : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <Landmark className="size-4 shrink-0" />
                <div>
                  <p className="font-medium">Wallet Guira</p>
                  <p className="text-[10px] opacity-70">Fondos en plataforma</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDestType('external')}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                  destType === 'external'
                    ? 'border-primary/50 bg-primary/5 text-primary'
                    : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <Globe className="size-4 shrink-0" />
                <div>
                  <p className="font-medium">Wallet externa</p>
                  <p className="text-[10px] opacity-70">Binance, MetaMask, etc.</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── PASO 2: Moneda de depósito (filtrado dinámico — Hallazgo 1) ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Moneda de depósito
            </Label>
            {availableCurrencies.length === 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                <Info className="size-3.5 shrink-0" />
                {destType === 'internal'
                  ? 'Ya tienes cuentas virtuales internas para todas las monedas disponibles. Puedes crear cuentas virtuales externas seleccionando "Wallet externa" arriba.'
                  : 'Ya tienes cuentas virtuales para todas las monedas disponibles.'}
              </div>
            ) : (
              <Select
                value={sourceCurrency}
                onValueChange={(val) => { if (val) setSourceCurrency(val as SourceCurrency) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="mr-1.5">{opt.flag}</span>
                      {opt.value.toUpperCase()} — {opt.label}
                      <span className="ml-1 text-muted-foreground">({opt.railLabel})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Aviso de límite de VAs externas alcanzado */}
            {externalLimitReached && (
              <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                Has alcanzado el límite de {DEFAULT_MAX_EXTERNAL_PER_CURRENCY} cuentas virtuales externas para {sourceCurrency.toUpperCase()}. Desactiva alguna antes de crear otra.
              </div>
            )}
          </div>

          {/* ── PASO 3A: Wallet interna selector ── */}
          {destType === 'internal' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Wallet destino
              </Label>
              {walletsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Cargando wallets…
                </div>
              ) : wallets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No se encontraron wallets activas.
                </p>
              ) : (
                <Select
                  value={destWalletId}
                  onValueChange={(val) => { if (val) setDestWalletId(val) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.label ?? `${w.currency.toUpperCase()} Wallet`}
                        <span className="ml-1 text-muted-foreground">
                          ({w.currency.toUpperCase()} · {w.network ?? 'interna'})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* ── PASO 3B: Wallet externa inputs ── */}
          {destType === 'external' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Dirección de wallet
                </Label>
                <Input
                  placeholder="0x1234...abcd"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  onBlur={() => setAddressTouched(true)}
                  className={`font-mono text-xs ${showAddressError ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                />
                {/* Hallazgo 6: Feedback de validación de dirección */}
                {showAddressError && (
                  <p className="text-[11px] text-destructive">
                    La dirección no parece tener un formato válido. Formatos soportados: EVM (0x…), Solana, Tron, Stellar.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Etiqueta <span className="text-muted-foreground/60">(opcional)</span>
                </Label>
                <Input
                  placeholder="ej: Mi Binance"
                  value={destLabel}
                  onChange={(e) => setDestLabel(e.target.value)}
                  className="text-xs"
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* ── PASO 4: Moneda crypto + Red ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Moneda crypto destino
              </Label>
              <Select
                value={destCurrency}
                onValueChange={(val) => { if (val) setDestCurrency(val as DestinationCurrency) }}
                disabled={destType === 'internal'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Hallazgo 5: Feedback para campos deshabilitados */}
              {destType === 'internal' && (
                <p className="text-[10px] text-muted-foreground/60">
                  Se auto-configura según la wallet seleccionada.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Red blockchain
              </Label>
              <Select
                value={destRail}
                onValueChange={(val) => { if (val) setDestRail(val as DestinationRail) }}
                disabled={destType === 'internal'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_RAIL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Hallazgo 5: Feedback para campos deshabilitados */}
              {destType === 'internal' && (
                <p className="text-[10px] text-muted-foreground/60">
                  Se auto-configura según la wallet seleccionada.
                </p>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {destType === 'internal'
                ? 'Se creará una cuenta bancaria virtual. Los fondos depositados se convertirán a crypto y se acreditarán en tu wallet Guira.'
                : 'Se creará una cuenta bancaria virtual. Los fondos depositados se convertirán a crypto y se enviarán directamente a tu wallet externa. No se acreditarán en el balance de Guira.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {submitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
