'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  Plus,
  Landmark,
  Globe,
  Info,
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

interface CreateVirtualAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCurrencies: SourceCurrency[]
  onCreated: (va: VirtualAccount) => void
}

// ── Component ────────────────────────────────────────────────────

export function CreateVirtualAccountDialog({
  open,
  onOpenChange,
  existingCurrencies,
  onCreated,
}: CreateVirtualAccountDialogProps) {
  // Form state
  const [sourceCurrency, setSourceCurrency] = useState<SourceCurrency | ''>('')
  const [destCurrency, setDestCurrency] = useState<DestinationCurrency | ''>('')
  const [destRail, setDestRail] = useState<DestinationRail | ''>('')
  const [destType, setDestType] = useState<DestinationType>('internal')
  const [destWalletId, setDestWalletId] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [destLabel, setDestLabel] = useState('')

  // Data
  const [wallets, setWallets] = useState<WalletBalance[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setSourceCurrency('')
      setDestCurrency('')
      setDestRail('')
      setDestType('internal')
      setDestWalletId('')
      setDestAddress('')
      setDestLabel('')
      setError(null)
    }
  }, [open])

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

  // Available source currencies (filter out already used)
  const availableCurrencies = SOURCE_CURRENCY_OPTIONS.filter(
    (o) => !existingCurrencies.includes(o.value)
  )

  const isValid =
    sourceCurrency !== '' &&
    destCurrency !== '' &&
    destRail !== '' &&
    (destType === 'internal'
      ? !!destWalletId
      : destAddress.trim().length > 0)

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
      <DialogTrigger
        render={
          <Button size="sm" className="shrink-0" />
        }
      >
        <Plus className="mr-1.5 size-3.5" />
        Crear cuenta virtual
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear cuenta virtual</DialogTitle>
          <DialogDescription>
            Genera una cuenta bancaria virtual para recibir depósitos. Los fondos se convertirán automáticamente a la criptomoneda elegida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Moneda de depósito */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Moneda de depósito
            </Label>
            {availableCurrencies.length === 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                <Info className="size-3.5 shrink-0" />
                Ya tienes cuentas virtuales para todas las monedas disponibles.
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
          </div>

          {/* Destino */}
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

          {/* Wallet interna selector */}
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

          {/* Wallet externa inputs */}
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
                  className="font-mono text-xs"
                />
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

          {/* Moneda crypto */}
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
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Se creará una cuenta bancaria virtual donde podrás recibir depósitos en la moneda seleccionada. Los fondos se convertirán automáticamente a la criptomoneda elegida y se enviarán al destino configurado.
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
