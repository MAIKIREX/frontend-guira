'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Wallet, Copy, Check, ArrowRightLeft, Coins, Pencil, X, Save, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  BridgeAdminService,
  type AdminLiquidationAddress,
  type UpdateLiquidationAddressDto,
} from '@/services/admin/bridge.admin.service'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'

// ── Helpers ───────────────────────────────────────────────────────────

const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  solana: 'Solana',
  tron: 'Tron',
  stellar: 'Stellar',
  avalanche_c_chain: 'Avalanche C-Chain',
  celo: 'Celo',
}

const RAIL_LABELS: Record<string, string> = {
  ach: 'ACH',
  ach_push: 'ACH Push',
  ach_same_day: 'ACH Same Day',
  wire: 'Wire',
  sepa: 'SEPA',
  spei: 'SPEI',
  pix: 'PIX',
  faster_payments: 'Faster Payments',
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">{label}</span>
      <span className={`text-sm text-right flex items-center gap-1 ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
        {mono && <CopyButton value={value} />}
      </span>
    </div>
  )
}

// ── Edit form ─────────────────────────────────────────────────────────

/**
 * Devuelve qué campos de referencia de pago son editables según el rail de destino.
 * Basado en la API de Bridge: cada rail tiene su propio campo de referencia.
 */
function getRailReferenceField(rail: string | null): {
  field: keyof UpdateLiquidationAddressDto
  label: string
  maxLength: number
  placeholder: string
} | null {
  switch (rail) {
    case 'ach':
    case 'ach_push':
    case 'ach_same_day':
      return { field: 'destination_ach_reference', label: 'ACH Reference', maxLength: 10, placeholder: 'Ej: REF001' }
    case 'wire':
      return { field: 'destination_wire_message', label: 'Wire Message', maxLength: 140, placeholder: 'Mensaje de wire (máx. 140 chars)' }
    case 'sepa':
      return { field: 'destination_sepa_reference', label: 'SEPA Reference', maxLength: 140, placeholder: 'Referencia SEPA (6–140 chars)' }
    case 'spei':
      return { field: 'destination_spei_reference', label: 'SPEI Reference', maxLength: 40, placeholder: 'Referencia SPEI (máx. 40 chars)' }
    case 'pix':
    case 'faster_payments':
      return { field: 'destination_reference', label: 'Payment Reference', maxLength: 140, placeholder: 'Referencia de pago' }
    default:
      return null
  }
}

interface EditFormProps {
  la: AdminLiquidationAddress
  userId: string
  onSaved: (updated: AdminLiquidationAddress) => void
  onCancel: () => void
}

function EditForm({ la, userId, onSaved, onCancel }: EditFormProps) {
  const isCryptoDestination = !!la.destination_address && !la.destination_payment_rail
  const railRef = getRailReferenceField(la.destination_payment_rail)

  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<UpdateLiquidationAddressDto>({
    external_account_id: la.destination_external_account_id ?? '',
    custom_developer_fee_percent: la.developer_fee_percent ?? '',
    return_address: '',
    // rail-specific reference — inicializar vacío; el usuario lo ingresa si quiere cambiarlo
    ...(railRef ? { [railRef.field]: '' } : {}),
  })

  const set = (key: keyof UpdateLiquidationAddressDto, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    // Construir solo los campos que tienen valor o son explícitamente null/vacío
    const payload: UpdateLiquidationAddressDto = {}

    const feeRaw = (fields.custom_developer_fee_percent as string)?.trim()
    if (feeRaw !== undefined && feeRaw !== la.developer_fee_percent) {
      payload.custom_developer_fee_percent = feeRaw === '' ? null : feeRaw
    }

    if (!isCryptoDestination) {
      const extId = (fields.external_account_id as string)?.trim()
      if (extId && extId !== la.destination_external_account_id) {
        payload.external_account_id = extId
      }
    }

    if (isCryptoDestination) {
      const retAddr = (fields.return_address as string)?.trim()
      if (retAddr) payload.return_address = retAddr
    }

    if (railRef) {
      const refVal = (fields[railRef.field] as string)?.trim()
      if (refVal) payload[railRef.field] = refVal as never
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No hay cambios que guardar.')
      return
    }

    setSaving(true)
    try {
      await BridgeAdminService.updateLiquidationAddress(userId, la.id, payload)
      toast.success('Liquidation address actualizada en Bridge y DB sincronizada.')
      // Reflejar los cambios localmente con los valores enviados hasta que el padre recargue
      onSaved({
        ...la,
        developer_fee_percent: payload.custom_developer_fee_percent !== undefined
          ? (payload.custom_developer_fee_percent ?? null)
          : la.developer_fee_percent,
        destination_external_account_id: payload.external_account_id ?? la.destination_external_account_id,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar en Bridge'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-border/40 pt-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        Los cambios se envían primero a Bridge. La DB local se actualiza solo si Bridge confirma el update.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Developer fee — siempre editable */}
        <div className="space-y-1.5">
          <Label className="text-xs">Developer Fee %</Label>
          <Input
            value={(fields.custom_developer_fee_percent as string) ?? ''}
            onChange={(e) => set('custom_developer_fee_percent', e.target.value)}
            placeholder="Ej: 0.5 (vacío = fee global)"
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Vacío para usar el fee global.</p>
        </div>

        {/* External account ID — solo para destinos fiat */}
        {!isCryptoDestination && (
          <div className="space-y-1.5">
            <Label className="text-xs">External Account ID</Label>
            <Input
              value={(fields.external_account_id as string) ?? ''}
              onChange={(e) => set('external_account_id', e.target.value)}
              placeholder="ext_..."
              className="h-8 text-sm font-mono"
            />
          </div>
        )}

        {/* Return address — solo para destinos crypto */}
        {isCryptoDestination && (
          <div className="space-y-1.5">
            <Label className="text-xs">Return Address (crypto)</Label>
            <Input
              value={(fields.return_address as string) ?? ''}
              onChange={(e) => set('return_address', e.target.value)}
              placeholder="Dirección de retorno en caso de fallo"
              className="h-8 text-sm font-mono"
            />
          </div>
        )}

        {/* Referencia de rail — si aplica */}
        {railRef && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{railRef.label}</Label>
            <Input
              value={(fields[railRef.field] as string) ?? ''}
              onChange={(e) => set(railRef.field, e.target.value)}
              placeholder={railRef.placeholder}
              maxLength={railRef.maxLength}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {saving ? 'Guardando...' : 'Guardar en Bridge'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="h-8">
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ── Address Details Sub-component ─────────────────────────────────────

function AddressDetailsSheet({
  la,
  user,
  onSaved,
}: {
  la: AdminLiquidationAddress
  user: Profile
  onSaved: (updated: AdminLiquidationAddress) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const chainLabel = CHAIN_LABELS[la.chain] ?? la.chain
  const railLabel = la.destination_payment_rail
    ? RAIL_LABELS[la.destination_payment_rail] ?? la.destination_payment_rail
    : null
  const isCryptoDestination = !!la.destination_address && !la.destination_payment_rail
  const isFiatDestination = !!la.destination_payment_rail && !isCryptoDestination

  return (
    <div className="space-y-6 mt-4">
      <SheetHeader>
        <div className="flex items-center gap-2">
           <Wallet className="h-5 w-5 text-primary" />
           <SheetTitle>{la.currency?.toUpperCase()} — {chainLabel}</SheetTitle>
        </div>
        <SheetDescription>
          Detalles y configuración de la dirección de liquidación.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-2">
        {la.is_active ? (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400">
            Activa
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inactiva
          </Badge>
        )}
        {isFiatDestination && (
          <Badge variant="outline" className="gap-1 text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-400">
            <ArrowRightLeft className="h-3 w-3" />
            Fiat → {railLabel}
          </Badge>
        )}
        {isCryptoDestination && (
          <Badge variant="outline" className="gap-1 text-violet-700 bg-violet-500/10 border-violet-500/20 dark:text-violet-400">
            <Coins className="h-3 w-3" />
            Crypto
          </Badge>
        )}
      </div>

      <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
        <h4 className="text-sm font-semibold mb-2">Información de Enrutamiento</h4>
        <div className="space-y-2">
          <InfoRow label="Bridge LA ID" value={la.bridge_liquidation_address_id} mono />
          {la.address && <InfoRow label="Dirección recepción" value={la.address} mono />}
          {la.destination_address && <InfoRow label="Destino (wallet)" value={la.destination_address} mono />}
          {la.destination_currency && (
            <InfoRow label="Moneda destino" value={la.destination_currency.toUpperCase()} />
          )}
          {la.destination_payment_rail && (
            <InfoRow label="Rail destino" value={railLabel ?? la.destination_payment_rail} />
          )}
          {la.destination_external_account_id && (
            <InfoRow label="External Account ID" value={la.destination_external_account_id} mono />
          )}
          {la.developer_fee_percent !== null && la.developer_fee_percent !== undefined && (
            <InfoRow label="Developer fee" value={`${la.developer_fee_percent}%`} />
          )}
          <InfoRow label="Creada" value={format(new Date(la.created_at), 'dd/MM/yyyy HH:mm')} />
        </div>
      </div>

      <div className="space-y-4 border-t border-border/40 pt-4">
        <div className="flex items-center justify-between">
           <h4 className="text-sm font-semibold">Configuración Avanzada</h4>
           {la.is_active && !isEditing && (
             <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
               <Pencil className="h-3 w-3 mr-2" />
               Editar
             </Button>
           )}
        </div>

        {isEditing && (
           <EditForm
             la={la}
             userId={user.id}
             onSaved={(updated) => {
               setIsEditing(false)
               onSaved(updated)
             }}
             onCancel={() => setIsEditing(false)}
           />
        )}
      </div>
    </div>
  )
}


// ── Main panel ────────────────────────────────────────────────────────

export function LiquidationAddressesPanel({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [addresses, setAddresses] = useState<AdminLiquidationAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AdminLiquidationAddress | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await BridgeAdminService.getLiquidationAddressesByUser(user.id)
      setAddresses(data)
    } catch {
      toast.error('Error al cargar las liquidation addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleSaved = (updated: AdminLiquidationAddress) => {
    setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelectedAddress(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando direcciones...
      </div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border/60">
        Este usuario no tiene liquidation addresses registradas.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Moneda / Red</TableHead>
              <TableHead>Tipo de Destino</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.map((la) => {
              const chainLabel = CHAIN_LABELS[la.chain] ?? la.chain
              const railLabel = la.destination_payment_rail
                ? RAIL_LABELS[la.destination_payment_rail] ?? la.destination_payment_rail
                : null
              const isCryptoDestination = !!la.destination_address && !la.destination_payment_rail
              const isFiatDestination = !!la.destination_payment_rail && !isCryptoDestination

              return (
                <TableRow 
                  key={la.id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => setSelectedAddress(la)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary/70" />
                      <span>{la.currency?.toUpperCase()} — {chainLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isFiatDestination && (
                      <Badge variant="outline" className="gap-1 text-xs text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-400">
                        <ArrowRightLeft className="h-3 w-3" />
                        Fiat → {railLabel}
                      </Badge>
                    )}
                    {isCryptoDestination && (
                      <Badge variant="outline" className="gap-1 text-xs text-violet-700 bg-violet-500/10 border-violet-500/20 dark:text-violet-400">
                        <Coins className="h-3 w-3" />
                        Crypto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {la.is_active ? (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 text-xs">
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAddress(la)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedAddress} onOpenChange={(open) => !open && setSelectedAddress(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedAddress && (
            <AddressDetailsSheet 
              la={selectedAddress} 
              user={user} 
              onSaved={handleSaved}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
