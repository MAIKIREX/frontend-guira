'use client'

import { useDeferredValue, useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  Percent,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import Flag from 'react-world-flags'

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: 'US',
  BOB: 'BO',
  EUR: 'EU',
  BRL: 'BR',
  COP: 'CO',
  MXN: 'MX',
  GBP: 'GB',
  PEN: 'PE',
  CLP: 'CL',
  ARS: 'AR',
}
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AppSettingDialog,
  FeeConfigDialog,
  RateConfigDialog,
} from '@/features/staff/components/admin-action-dialogs'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'
import { AdminService } from '@/services/admin.service'
import { UsersAdminService, type VaFeeDefault } from '@/services/admin/users.admin.service'
import { cn } from '@/lib/utils'
import type { StaffDashboardLoadedState } from '@/features/staff/components/staff-dashboard-page'
import type { AppSettingRow, FeeConfigRow } from '@/types/payment-order'
import type { StaffActor } from '@/types/staff'

/* ── Label map ── */
const OPERATION_LABELS: Record<string, string> = {
  interbank_bo_out: 'Bolivia → Exterior (1.1)',
  interbank_w2w: 'Wallet → Wallet (1.2)',
  interbank_bo_wallet: 'Bolivia → Wallet (1.3)',
  interbank_bo_in: 'Exterior → Bolivia (1.4)',
  ramp_on_fiat_us: 'Fiat US → Wallet (1.5/2.3)',
  ramp_on_bo: 'Fiat BO → Wallet (2.1)',
  ramp_on_crypto: 'Crypto → Wallet (2.2)',
  ramp_off_bo: 'Wallet → Fiat BO (2.4)',
  ramp_off_crypto: 'Wallet → Crypto (2.5)',
  ramp_off_fiat_us: 'Wallet → Fiat US (2.6)',
  wallet_to_fiat_off: 'On-Chain → Fiat (2.7)',
}

const feeDisplayValue = (r: FeeConfigRow) => {
  if (r.fee_type === 'percent') return `${Number(r.fee_percent || 0)}%`
  if (r.fee_type === 'fixed') return `$${Number(r.fee_fixed || 0)}`
  return `$${Number(r.fee_fixed || 0)} + ${Number(r.fee_percent || 0)}%`
}

function formatRateVal(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : String(value ?? '—')
}

function normalize(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function textMatches(query: string, values: Array<unknown>) {
  if (!query.trim()) return true
  const q = normalize(query)
  return values.some((v) => normalize(v).includes(q))
}

/* ══════════════════════════════════════════════════════════════
   ConfigPanel — Apple-inspired tabbed layout
   ══════════════════════════════════════════════════════════════ */
export function StaffConfigPanelV2({
  snapshot,
  actor,
  isPrivileged,
  reload,
  replaceAppSetting,
  replaceFeeConfig,
}: Pick<
  StaffDashboardLoadedState,
  'snapshot' | 'actor' | 'isPrivileged' | 'reload' | 'replaceAppSetting' | 'replaceFeeConfig'
>) {
  return (
    <ConfigPanelInner
      actor={actor}
      appSettings={snapshot.appSettings}
      feesConfig={snapshot.feesConfig}
      isPrivileged={isPrivileged}
      reload={reload}
      onUpdateAppSetting={replaceAppSetting}
      onUpdateFeeConfig={replaceFeeConfig}
    />
  )
}

function ConfigPanelInner({
  actor,
  appSettings,
  feesConfig,
  isPrivileged,
  reload,
  onUpdateAppSetting,
  onUpdateFeeConfig,
}: {
  actor: StaffActor
  appSettings: AppSettingRow[]
  feesConfig: FeeConfigRow[]
  isPrivileged: boolean
  reload: () => Promise<void>
  onUpdateAppSetting: (record: AppSettingRow) => void
  onUpdateFeeConfig: (record: FeeConfigRow) => void
}) {
  const [activeTab, setActiveTab] = useState<'rates' | 'fees' | 'settings' | 'va-fees'>('rates')
  const [isSyncingRates, setIsSyncingRates] = useState(false)
  const [feeQuery, setFeeQuery] = useState('')
  const [settingsQuery, setSettingsQuery] = useState('')
  const deferredFeeQuery = useDeferredValue(feeQuery)
  const deferredSettingsQuery = useDeferredValue(settingsQuery)
  const { rates, reload: reloadRates } = useExchangeRates()

  async function handleSyncParallelRates() {
    try {
      setIsSyncingRates(true)
      const result = await AdminService.syncExchangeRates({ actor })
      toast.success(
        `${result.message}. Compra ${formatRateVal(result.buy_rate_bob_usd)} | Venta ${formatRateVal(result.sell_rate_usd_bob)}`
      )
      await reloadRates()
      await reload()
    } catch (error) {
      console.error('Failed to sync parallel rates', error)
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar las tasas paralelas.')
    } finally {
      setIsSyncingRates(false)
    }
  }

  /* Fee categorisation */
  const interbankFees = feesConfig.filter((r) => r.operation_type?.startsWith('interbank'))
  const rampOnFees = feesConfig.filter((r) => r.operation_type?.startsWith('ramp_on'))
  const rampOffFees = feesConfig.filter(
    (r) => r.operation_type?.startsWith('ramp_off') || r.operation_type === 'wallet_to_fiat_off'
  )
  const otherFees = feesConfig.filter(
    (r) =>
      !r.operation_type?.startsWith('interbank') &&
      !r.operation_type?.startsWith('ramp_on') &&
      !r.operation_type?.startsWith('ramp_off') &&
      r.operation_type !== 'wallet_to_fiat_off'
  )

  /* Fee search */
  const matchesFee = (fee: FeeConfigRow) => {
    const label = OPERATION_LABELS[fee.operation_type ?? ''] ?? fee.operation_type ?? fee.type ?? ''
    return textMatches(deferredFeeQuery, [label, fee.payment_rail, fee.fee_type, fee.operation_type])
  }
  const fInterbank = interbankFees.filter(matchesFee)
  const fRampOn = rampOnFees.filter(matchesFee)
  const fRampOff = rampOffFees.filter(matchesFee)
  const fOther = otherFees.filter(matchesFee)
  const totalFiltered = fInterbank.length + fRampOn.length + fRampOff.length + fOther.length

  /* Settings search */
  const filteredSettings = appSettings.filter((r, i) => {
    const key = String(r.key ?? r.name ?? `setting-${i + 1}`)
    const value = String(r.value ?? '')
    return textMatches(deferredSettingsQuery, [key, value])
  })

  const tabMeta = {
    rates: { title: 'Tipos de Cambio', desc: 'Paridades cambiarias activas del servicio interno.' },
    fees: { title: 'Estructura de Comisiones', desc: 'Tasas para creación de rutas y pagos a proveedores.' },
    settings: { title: 'Variables del Sistema', desc: 'Ajustes globales y constantes operativas.' },
    'va-fees': { title: 'Fees Cuentas Virtuales', desc: 'Tarifa global por defecto para cuentas virtuales.' },
  } as const

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="gap-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight break-words">{tabMeta[activeTab].title}</h1>
          <p className="text-sm text-muted-foreground">{tabMeta[activeTab].desc}</p>
        </div>
        <TabsList variant="line" className="w-full flex-wrap justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="rates" className="rounded-none px-4 py-2">Tasas</TabsTrigger>
          <TabsTrigger value="fees" className="rounded-none px-4 py-2">Comisiones</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none px-4 py-2">Variables</TabsTrigger>
          <TabsTrigger value="va-fees" className="rounded-none px-4 py-2">VA Fees</TabsTrigger>
        </TabsList>
      </div>

      {/* ── TASAS ── */}
      <TabsContent value="rates">
        <div className="space-y-12 pt-12 pb-16 flex flex-col items-center max-w-3xl mx-auto">
          {!isPrivileged && <div className="w-full"><AdminOnlyNotice /></div>}
          <div className="grid w-full gap-16 sm:grid-cols-2">
            {rates.rawRates.map((record: any) => {
              const baseRate = record.rate
              const effectiveRate = record.effective_rate ?? record.rate

              return (
                <div key={record.id || record.pair} className="flex flex-col items-center space-y-4 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {record.pair === 'BOB_USD'
                      ? 'Compra (BOB → USD)'
                      : record.pair === 'USD_BOB'
                        ? 'Venta (USD → BOB)'
                        : record.pair}
                  </div>
                  <div className="text-6xl font-bold tracking-tight tabular-nums text-foreground">
                    {formatRateVal(effectiveRate)}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mt-1">
                    Tasa base: {formatRateVal(baseRate)}
                  </div>
                  <div className="flex flex-col items-center gap-4 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {record.pair || `${record.from_currency}_${record.to_currency}`}
                      </span>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        Spread {record.spread_percent ?? 0}%
                      </span>
                    </div>
                    {isPrivileged && (
                      <div className="mt-1">
                        <RateConfigDialog actor={actor} record={record} onUpdated={() => reloadRates()} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex w-full flex-col gap-4 border-t border-border/20 pt-8 mt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Origen: Servicio interno de Tipos de Cambio.</p>
            <Button disabled={!isPrivileged || isSyncingRates} onClick={handleSyncParallelRates} type="button" variant="outline">
              <RefreshCw className={cn(isSyncingRates ? 'animate-spin' : undefined)} />
              {isSyncingRates ? 'Actualizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* ── COMISIONES ── */}
      <TabsContent value="fees">
        <div className="space-y-10 pt-8 pb-12 max-w-3xl mx-auto">
          {!isPrivileged && <AdminOnlyNotice />}
          <Input
            value={feeQuery}
            onChange={(e) => setFeeQuery(e.target.value)}
            placeholder="Buscar comisión por nombre, rail o tipo..."
            className="h-10 max-w-md border-border/50 bg-transparent"
          />
          {deferredFeeQuery && totalFiltered === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay comisiones que coincidan con &quot;{deferredFeeQuery}&quot;.
            </p>
          ) : (
            <>
              <FeeGroup title="Flujos Interbank" fees={fInterbank} total={interbankFees.length} actor={actor} isPrivileged={isPrivileged} onUpdate={onUpdateFeeConfig} />
              <FeeGroup title="Depósitos (On-Ramp)" fees={fRampOn} total={rampOnFees.length} actor={actor} isPrivileged={isPrivileged} onUpdate={onUpdateFeeConfig} />
              <FeeGroup title="Retiros (Off-Ramp)" fees={fRampOff} total={rampOffFees.length} actor={actor} isPrivileged={isPrivileged} onUpdate={onUpdateFeeConfig} />
              {otherFees.length > 0 && (
                <FeeGroup title="Otras Comisiones" fees={fOther} total={otherFees.length} actor={actor} isPrivileged={isPrivileged} onUpdate={onUpdateFeeConfig} />
              )}
            </>
          )}
          {deferredFeeQuery && totalFiltered > 0 && (
            <p className="text-xs text-muted-foreground">{totalFiltered} de {feesConfig.length} comisiones</p>
          )}
        </div>
      </TabsContent>

      {/* ── VARIABLES ── */}
      <TabsContent value="settings">
        <div className="space-y-10 pt-8 pb-12 max-w-3xl mx-auto">
          {!isPrivileged && <AdminOnlyNotice />}
          <Input
            value={settingsQuery}
            onChange={(e) => setSettingsQuery(e.target.value)}
            placeholder="Buscar variable por nombre o valor..."
            className="h-10 max-w-md border-border/50 bg-transparent"
          />
          {filteredSettings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {deferredSettingsQuery
                ? `No hay variables que coincidan con "${deferredSettingsQuery}".`
                : 'Sin variables detectadas.'}
            </p>
          ) : (
            <div className="flex flex-col">
              {filteredSettings.map((record, index) => {
                const key = String(record.key ?? record.name ?? `setting-${index + 1}`)
                const value = String(record.value ?? 'sin valor')
                return (
                  <div
                    key={String(record.id ?? key)}
                    className="flex items-center justify-between gap-4 py-4 group transition-colors hover:bg-muted/10 border-b border-border/80 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-semibold text-foreground truncate" title={key}>
                        {key}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 max-w-[60%]">
                      <div className="text-base font-medium text-muted-foreground truncate text-right" title={value}>
                        {value.length > 60 ? `${value.slice(0, 60)}…` : value}
                      </div>
                      {isPrivileged && (
                        <div className="shrink-0 ml-2">
                          <AppSettingDialog actor={actor} onUpdated={onUpdateAppSetting} record={record} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {deferredSettingsQuery && filteredSettings.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filteredSettings.length} de {appSettings.length} variables
            </p>
          )}
        </div>
      </TabsContent>

      {/* ── VA FEES ── */}
      <TabsContent value="va-fees">
        <div className="max-w-3xl mx-auto pt-8 pb-12 space-y-10">
          <VaFeeDefaultsSection isPrivileged={isPrivileged} />
        </div>
      </TabsContent>
    </Tabs>
  )
}

/* ── Fee group with section header ── */
function FeeGroup({
  title,
  fees,
  total,
  actor,
  isPrivileged,
  onUpdate,
}: {
  title: string
  fees: FeeConfigRow[]
  total: number
  actor: StaffActor
  isPrivileged: boolean
  onUpdate: (record: FeeConfigRow) => void
}) {
  if (fees.length === 0 && total === 0) return null

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-cyan-400">{title}</h3>
        <span className="text-[12px] font-medium tabular-nums text-muted-foreground/60">{fees.length}</span>
      </div>
      {fees.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Sin resultados en esta categoría.</p>
      ) : (
        <div className="flex flex-col">
          {fees.map((record) => {
            const label = OPERATION_LABELS[record.operation_type ?? ''] ?? record.operation_type ?? record.type ?? '—'
            return (
              <div key={record.id} className="flex items-center justify-between gap-4 py-4 group transition-colors hover:bg-muted/10 border-b border-border/80 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-foreground">{label}</span>
                    {!record.is_active && (
                      <Badge variant="destructive" className="bg-destructive/15 text-destructive text-[10px] px-2 py-0">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground/90">
                    <span className="font-mono font-medium uppercase tracking-wider">{record.payment_rail || 'N/A'}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>
                      {record.fee_type === 'percent' ? 'Porcentual' : record.fee_type === 'fixed' ? 'Monto Fijo' : 'Mixto'}
                    </span>
                    {(Number(record.min_fee) > 0 || Number(record.max_fee) > 0) && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span>
                          {Number(record.min_fee) > 0 ? `Min $${record.min_fee}` : ''}
                          {Number(record.min_fee) > 0 && Number(record.max_fee) > 0 ? ' – ' : ''}
                          {Number(record.max_fee) > 0 ? `Max $${record.max_fee}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                    {feeDisplayValue(record)}
                  </span>
                  {isPrivileged && (
                    <span className="ml-2">
                      <FeeConfigDialog actor={actor} onUpdated={onUpdate} record={record} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── VA Fee Defaults (clean version) ── */
function VaFeeDefaultsSection({ isPrivileged }: { isPrivileged: boolean }) {
  const [data, setData] = useState<VaFeeDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await UsersAdminService.listVaFeeDefaults()
      setData(res)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar VA Fee Defaults')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPrivileged) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isPrivileged])

  const handleSave = async (record: VaFeeDefault) => {
    try {
      setSaving(true)
      const newValue = parseFloat(editValue)
      if (isNaN(newValue) || newValue < 0 || newValue > 100) {
        toast.error('El fee debe ser un número válido entre 0 y 100.')
        return
      }
      await UsersAdminService.updateVaFeeDefault({
        source_currency: record.source_currency,
        destination_type: record.destination_type,
        fee_percent: newValue,
      })
      toast.success('Fee global actualizado exitosamente.')
      setEditingId(null)
      loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el fee global.')
    } finally {
      setSaving(false)
    }
  }

  if (!isPrivileged) return <AdminOnlyNotice />

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando configuración…
      </div>
    )
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay fees configurados para las cuentas virtuales.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        {data.map((record) => (
          <div key={record.id} className="flex items-center justify-between gap-4 py-4 group transition-colors hover:bg-muted/10 border-b border-border/80 last:border-0">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/20 shadow-sm bg-muted/30">
                    <Flag code={CURRENCY_TO_COUNTRY[record.source_currency.toUpperCase()] || 'US'} className="h-full w-full object-cover" />
                  </div>
                  <span>{record.source_currency.toUpperCase()}</span>
                </div>
                <ArrowRightLeft className="size-4 text-muted-foreground/60" />
                <span>{record.destination_type === 'wallet_bridge' ? 'Bridge' : 'Externa'}</span>
              </div>
              <div className="font-mono text-[13px] text-muted-foreground/90 uppercase tracking-wider">{record.destination_type}</div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {editingId === record.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 w-20 text-sm font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(record)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    disabled={saving}
                  />
                  <span className="text-sm font-bold text-muted-foreground">%</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => handleSave(record)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                  >
                    <XCircle className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">{record.fee_percent}%</span>
                  {isPrivileged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 ml-2"
                      onClick={() => {
                        setEditValue(record.fee_percent.toString())
                        setEditingId(record.id)
                      }}
                    >
                      Editar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        <p className="leading-relaxed">
          Estos porcentajes se aplican automáticamente a todas las cuentas virtuales.
          Si un usuario tiene un override configurado, prevalecerá el override.
        </p>
      </div>
    </div>
  )
}

/* ── Shared notice ── */
function AdminOnlyNotice() {
  return (
    <div className="rounded-xl border border-dashed border-border/50 px-4 py-3 text-sm text-muted-foreground">
      Estas acciones están reservadas para usuarios con rol <code className="font-mono text-xs">admin</code>.
    </div>
  )
}
