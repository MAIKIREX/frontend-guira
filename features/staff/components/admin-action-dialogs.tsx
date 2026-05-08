'use client'

import React, { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Flag from 'react-world-flags'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/browser'
import { Label } from '@/components/ui/label'
import { ACCEPTED_UPLOADS, safeFileExtension } from '@/lib/file-validation'
import { ACTIVE_CRYPTO_NETWORKS, CRYPTO_NETWORK_LABELS } from '@/features/payments/lib/crypto-networks'
import {
  ShieldCheck,
  CircleDollarSign,
  AlertTriangle,
  Bell,
  Trash2,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Percent,
  Globe,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminService } from '@/services/admin.service'
import { UsersAdminService, type FeeOverride, type LimitOverride, type CreateLimitOverridePayload, type VaFeeMatrixEntry, type AdminVirtualAccount, type UpdateVirtualAccountPayload } from '@/services/admin/users.admin.service'
import {
  adminAppSettingSchema,
  adminCreateUserSchema,
  adminFeeConfigSchema,
  adminReasonSchema,
  adminPsavRecordSchema,
  adminChangeRoleSchema,
  adminFeeOverrideSchema,
  adminLimitOverrideSchema,

  type AdminAppSettingValues,
  type AdminCreateUserValues,
  type AdminFeeConfigValues,
  type AdminReasonValues,
  type AdminPsavRecordValues,
  type AdminChangeRoleValues,
  type AdminFeeOverrideValues,
  type AdminLimitOverrideValues,

  adminRateConfigSchema,
  type AdminRateConfigValues,
} from '@/features/staff/schemas/admin-actions.schema'
import { ConfigAdminService, type ExchangeRatePair } from '@/services/admin/config.admin.service'
import { BankAccountsAdminService, type PendingBankAccount } from '@/services/admin/bank-accounts.admin.service'
import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'

export function CreateUserDialog({ actor, onUpdated }: { actor: StaffActor; onUpdated: (profile: Profile | null) => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminCreateUserValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      role: 'client',
      reason: '',
    },
  })

  async function submit(values: AdminCreateUserValues) {
    try {
      const result = await AdminService.createUser({
        actor,
        email: values.email,
        password: values.password,
        fullName: values.full_name,
        role: values.role,
        reason: values.reason,
      })
      toast.success('Usuario creado.')
      setOpen(false)
      form.reset()
      await onUpdated(result.profile)
    } catch (error) {
      console.error('Failed to create user', error)
      toast.error('No se pudo crear el usuario.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Crear usuario</DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Invoca `admin-create-user` y deja trazabilidad en auditoria.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><PasswordInput {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">client</SelectItem>
                      <SelectItem value="staff">staff</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica la creacion" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Crear usuario'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function UserDetailDialog({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Administrar</DialogTrigger>
      <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle>Administrar Usuario</DialogTitle>
          <DialogDescription>Gestión de identidad y seguridad de acceso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/70">
            <div><span className="text-muted-foreground block text-xs">Nombre:</span> <span className="font-medium">{user.full_name || 'Sin nombre'}</span></div>
            <div><span className="text-muted-foreground block text-xs">Email:</span> <span className="font-medium">{user.email}</span></div>
            <div><span className="text-muted-foreground block text-xs">Rol:</span> <Badge variant="outline">{user.role}</Badge></div>
            <div><span className="text-muted-foreground block text-xs">Archivado:</span> <span className={"font-semibold " + (user.is_archived ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400")}>{user.is_archived ? 'Sí' : 'No'}</span></div>
          </div>
          
          <div className="text-xs text-muted-foreground mt-4">
            Acciones disponibles sobre este usuario:
          </div>
        </div>

        <DialogFooter className="mt-6 border-t pt-4 sm:justify-start">
          <UserAdminActions actor={actor} onUpdated={onUpdated} user={user} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserAdminActions({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ChangeRoleDialog actor={actor} onUpdated={onUpdated} user={user} />
      <FeeOverridesDialog actor={actor} user={user} />
      <VaFeeOverrideDialog actor={actor} user={user} />
      <BankAccountReviewDialog actor={actor} user={user} />
      <ResetPasswordDialog actor={actor} email={user.email} onUpdated={onUpdated} />
      {user.is_archived ? (
        <UnarchiveUserDialog actor={actor} onUpdated={onUpdated} user={user} />
      ) : (
        <ArchiveDeleteUserDialog action="archive" actor={actor} onUpdated={onUpdated} user={user} />
      )}
      {!user.is_archived ? (
        <ArchiveDeleteUserDialog action="delete" actor={actor} onUpdated={onUpdated} user={user} />
      ) : null}
    </div>
  )
}

/**
 * FeeOverridesPanel — Standalone panel for fee overrides management.
 * Can be rendered inline (user detail page) or inside a Dialog wrapper.
 */
export function FeeOverridesPanel({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [overrides, setOverrides] = useState<FeeOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Solo admin y super_admin pueden gestionar overrides
  const canManage = actor.role === 'admin' || actor.role === 'super_admin'
  const canDelete = actor.role === 'super_admin'

  const form = useForm<AdminFeeOverrideValues>({
    resolver: zodResolver(adminFeeOverrideSchema) as Resolver<AdminFeeOverrideValues>,
    defaultValues: {
      operation_type: 'ramp_off_bo',
      payment_rail: 'psav',
      currency: 'USD',
      fee_type: 'percent',
      fee_percent: undefined,
      fee_fixed: undefined,
      min_fee: undefined,
      max_fee: undefined,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      notes: '',
    },
  })

  const watchFeeType = form.watch('fee_type')
  const watchOperationType = form.watch('operation_type')

  useEffect(() => {
    if (!watchOperationType) return
    const isPsav = watchOperationType.includes('_bo')
    form.setValue('payment_rail', isPsav ? 'psav' : 'bridge')
  }, [watchOperationType, form])

  const loadOverrides = async () => {
    setLoading(true)
    try {
      const data = await UsersAdminService.getOverrides(user.id)
      setOverrides(data)
    } catch {
      toast.error('Error al cargar overrides')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleToggle = async (override: FeeOverride) => {
    try {
      await UsersAdminService.updateOverride(override.id, { is_active: !override.is_active })
      toast.success(override.is_active ? 'Override desactivado' : 'Override activado')
      loadOverrides()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      toast.error(msg)
    }
  }

  const handleDelete = async (override: FeeOverride) => {
    if (!confirm(`¿Eliminar permanentemente el override ${override.operation_type}/${override.payment_rail}?`)) return
    try {
      await UsersAdminService.deleteOverride(override.id)
      toast.success('Override eliminado')
      loadOverrides()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const onSubmit = async (values: AdminFeeOverrideValues) => {
    setCreating(true)
    try {
      await UsersAdminService.createOverride({
        user_id: user.id,
        operation_type: values.operation_type,
        payment_rail: values.payment_rail,
        currency: values.currency,
        fee_type: values.fee_type,
        ...(values.fee_percent !== undefined ? { fee_percent: values.fee_percent } : {}),
        ...(values.fee_fixed !== undefined ? { fee_fixed: values.fee_fixed } : {}),
        ...(values.min_fee !== undefined ? { min_fee: values.min_fee } : {}),
        ...(values.max_fee !== undefined ? { max_fee: values.max_fee } : {}),
        valid_from: values.valid_from || new Date().toISOString().split('T')[0],
        ...(values.valid_until ? { valid_until: values.valid_until } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
      toast.success('Override creado exitosamente')
      form.reset()
      setShowForm(false)
      loadOverrides()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear override'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  if (!canManage) return null

  const feeDisplay = (o: FeeOverride) => {
    if (o.fee_type === 'percent') return `${o.fee_percent ?? 0}%`
    if (o.fee_type === 'fixed') return `$${o.fee_fixed ?? 0}`
    return `$${o.fee_fixed ?? 0} + ${o.fee_percent ?? 0}%`
  }

  return (
    <>
      {/* ── Lista de overrides existentes ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Overrides Activos</h4>
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5 text-xs">
              {showForm ? 'Cancelar' : '+ Nuevo Override'}
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-6">Cargando...</div>
          ) : overrides.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
              Sin overrides configurados. Este usuario usa las tarifas globales.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {overrides.map((o) => (
                <div key={o.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${o.is_active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border/40 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={o.is_active ? 'default' : 'secondary'} className="text-[10px] font-mono">
                        {o.operation_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">{o.payment_rail}</Badge>
                      <Badge variant="outline" className="text-[10px]">{o.currency}</Badge>
                      <span className="font-semibold text-xs">{feeDisplay(o)}</span>
                    </div>
                    {o.notes && <div className="text-xs text-muted-foreground mt-1 truncate">{o.notes}</div>}
                    {o.valid_until && <div className="text-[10px] text-muted-foreground mt-0.5">Vigente hasta: {o.valid_until}</div>}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={o.is_active}
                        onCheckedChange={() => handleToggle(o)}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground w-7">{o.is_active ? 'ON' : 'OFF'}</span>
                    </div>
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(o)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Formulario para crear nuevo override ── */}
        {showForm && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3">Crear Nuevo Override</h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Tipo de operación */}
                  <FormField control={form.control} name="operation_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Operación</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="interbank_bo_out">Bolivia → Exterior (1.1)</SelectItem>
                          <SelectItem value="interbank_w2w">Wallet → Wallet (1.2)</SelectItem>
                          <SelectItem value="interbank_bo_wallet">Bolivia → Wallet (1.3)</SelectItem>
                          <SelectItem value="interbank_bo_in">Exterior → Bolivia (1.4)</SelectItem>
                          <SelectItem value="ramp_on_fiat_us">Fiat US → Wallet (1.5/2.3)</SelectItem>
                          <SelectItem value="ramp_on_bo">Fiat BO → Wallet (2.1)</SelectItem>
                          <SelectItem value="ramp_on_crypto">Crypto → Wallet (2.2)</SelectItem>
                          <SelectItem value="ramp_off_bo">Wallet → Fiat BO (2.4)</SelectItem>
                          <SelectItem value="ramp_off_crypto">Wallet → Crypto (2.5)</SelectItem>
                          <SelectItem value="ramp_off_fiat_us">Wallet → Fiat US (2.6)</SelectItem>
                          <SelectItem value="wallet_to_fiat_off">On-Chain → Fiat (2.7)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Payment rail */}
                  <FormField control={form.control} name="payment_rail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Payment Rail</FormLabel>
                      <Select disabled onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="psav">PSAV (Manual)</SelectItem>
                          <SelectItem value="bridge">Bridge (API)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Moneda */}
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Moneda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="BOB">BOB</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="USDT">USDT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Tipo de fee */}
                  <FormField control={form.control} name="fee_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tipo de Fee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="percent">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto Fijo</SelectItem>
                          <SelectItem value="mixed">Mixto (Fijo + %)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Fee percent — visible si percent o mixed */}
                  {(watchFeeType === 'percent' || watchFeeType === 'mixed') && (
                    <FormField control={form.control} name="fee_percent" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Fee %</FormLabel>
                        <FormControl><Input {...field} type="number" step="0.01" placeholder="0.5" className="h-9 text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Fee fixed — visible si fixed o mixed */}
                  {(watchFeeType === 'fixed' || watchFeeType === 'mixed') && (
                    <FormField control={form.control} name="fee_fixed" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Fee Fijo ($)</FormLabel>
                        <FormControl><Input {...field} type="number" step="0.01" placeholder="2.00" className="h-9 text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Min fee */}
                  <FormField control={form.control} name="min_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fee Mínimo ($)</FormLabel>
                      <FormControl><Input {...field} type="number" step="0.01" placeholder="0" className="h-9 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Max fee */}
                  <FormField control={form.control} name="max_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fee Máximo ($)</FormLabel>
                      <FormControl><Input {...field} type="number" step="0.01" placeholder="0" className="h-9 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Valid from */}
                  <FormField control={form.control} name="valid_from" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Vigente Desde</FormLabel>
                      <FormControl><Input {...field} type="date" className="h-9 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Valid until */}
                  <FormField control={form.control} name="valid_until" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Vigente Hasta</FormLabel>
                      <FormControl><Input {...field} type="date" className="h-9 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notas / Justificación</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="Ej: Cliente VIP — volumen mensual +$500K" className="text-xs resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-md flex-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Los overrides tienen efecto inmediato en el cálculo de fees.
                  </div>
                  <Button type="submit" size="sm" disabled={creating} className="gap-1.5 shrink-0">
                    {creating ? 'Creando...' : 'Crear Override'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
    </>
  )
}

function FeeOverridesDialog({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [open, setOpen] = useState(false)
  const canManage = actor.role === 'admin' || actor.role === 'super_admin'
  if (!canManage) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <CircleDollarSign className="h-3.5 w-3.5" />
        Tarifas VIP
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-amber-500" />
            Tarifas Personalizadas
          </DialogTitle>
          <DialogDescription>
            Gestiona las tarifas especiales para <strong>{user.full_name || user.email}</strong>.
            Los overrides tienen prioridad sobre la configuración global de fees.
          </DialogDescription>
        </DialogHeader>
        {open ? <FeeOverridesPanel actor={actor} user={user} /> : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * VaFeeOverridePanel — Standalone panel for VA fee matrix + VAs management.
 * Master-Detail UI: left sidebar selects currency, right panel shows fee config.
 * VAs shown in a clean data table with dropdown actions + edit modal.
 */
export function VaFeeOverridePanel({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [loading, setLoading] = useState(false)
  const [feeMatrix, setFeeMatrix] = useState<VaFeeMatrixEntry[]>([])
  const [userVAs, setUserVAs] = useState<AdminVirtualAccount[]>([])

  // Estado para la moneda seleccionada en el sidebar
  const [selectedCurrency, setSelectedCurrency] = useState<string>('usd')

  // Estado para edición de override en la matriz
  const [editingDestType, setEditingDestType] = useState<string | null>(null)
  const [editCellFee, setEditCellFee] = useState('')
  const [editCellReason, setEditCellReason] = useState('')
  const [savingCell, setSavingCell] = useState(false)

  // Estado para edición de VA (modal)
  const [editingVa, setEditingVa] = useState<AdminVirtualAccount | null>(null)
  const [editVaForm, setEditVaForm] = useState<{ fee: string; address: string; currency: string; payment_rail: string; reason: string }>({ fee: '', address: '', currency: '', payment_rail: '', reason: '' })
  const [savingVa, setSavingVa] = useState(false)

  const canManage = actor.role === 'admin' || actor.role === 'super_admin'

  const CURRENCIES = ['usd', 'eur', 'mxn', 'brl', 'gbp', 'cop'] as const
  const CURRENCY_FLAG_CODES: Record<string, string> = {
    usd: 'us',
    eur: 'eu',
    mxn: 'mx',
    brl: 'br',
    gbp: 'gb',
    cop: 'co',
  }
  const CURRENCY_FLAGS: Record<string, string> = { usd: '🇺🇸', eur: '🇪🇺', mxn: '🇲🇽', brl: '🇧🇷', gbp: '🇬🇧', cop: '🇨🇴' }
  const DEST_TYPES = ['wallet_bridge', 'wallet_external'] as const
  const DEST_TYPE_LABELS: Record<string, string> = { wallet_bridge: 'Wallet Bridge', wallet_external: 'Wallet Externa' }
  const DEST_TYPE_ICONS: Record<string, string> = { wallet_bridge: '🔗', wallet_external: '🌐' }
  const DESTINATION_CURRENCIES = ['usdc', 'usdt', 'usdb', 'dai', 'pyusd', 'eurc'] as const

  const loadData = async () => {
    setLoading(true)
    try {
      const [matrix, vas] = await Promise.all([
        UsersAdminService.getVaFeeMatrix(user.id),
        UsersAdminService.listUserVirtualAccounts(user.id),
      ])
      setFeeMatrix(matrix)
      setUserVAs(vas)
    } catch {
      toast.error('Error al cargar datos de fee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const getFeeEntry = (currency: string, destType: string) =>
    feeMatrix.find((e) => e.source_currency === currency && e.destination_type === destType)

  // ── Fee Matrix Handlers ──
  const startEditCell = (destType: string) => {
    const entry = getFeeEntry(selectedCurrency, destType)
    setEditingDestType(destType)
    setEditCellFee(entry?.resolved_fee != null ? String(entry.resolved_fee) : '')
    setEditCellReason('')
  }

  const cancelEditCell = () => { setEditingDestType(null); setEditCellFee(''); setEditCellReason('') }

  const handleSetCellOverride = async () => {
    if (!editingDestType) return
    const fee = parseFloat(editCellFee)
    if (isNaN(fee) || fee < 0 || fee > 100) { toast.error('Fee debe ser entre 0 y 100.'); return }
    if (editCellReason.trim().length < 5) { toast.error('Motivo mínimo 5 caracteres.'); return }
    setSavingCell(true)
    try {
      await UsersAdminService.setVaFeeOverride(user.id, {
        source_currency: selectedCurrency,
        destination_type: editingDestType,
        fee_percent: fee,
        reason: editCellReason.trim(),
      })
      toast.success(`Override: ${selectedCurrency.toUpperCase()} / ${DEST_TYPE_LABELS[editingDestType]} → ${fee}%`)
      cancelEditCell()
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar override')
    } finally { setSavingCell(false) }
  }

  const handleClearCellOverride = async (destType: string) => {
    if (!confirm(`¿Eliminar override para ${selectedCurrency.toUpperCase()} / ${DEST_TYPE_LABELS[destType]}?`)) return
    try {
      await UsersAdminService.clearVaFeeOverride(user.id, selectedCurrency, destType)
      toast.success('Override eliminado — se aplicará el fee global.')
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar override')
    }
  }

  // ── VA Edit Handlers ──
  const openEditVaModal = (va: AdminVirtualAccount) => {
    setEditingVa(va)
    setEditVaForm({
      fee: va.developer_fee_percent != null ? String(va.developer_fee_percent) : '',
      address: va.destination_address ?? '',
      payment_rail: va.destination_payment_rail ?? '',
      currency: va.destination_currency ?? '',
      reason: '',
    })
  }

  const closeEditVaModal = () => { setEditingVa(null); setEditVaForm({ fee: '', address: '', currency: '', payment_rail: '', reason: '' }) }

  const handleSaveVa = async () => {
    if (!editingVa) return
    if (!editVaForm.reason || editVaForm.reason.trim().length < 5) { toast.error('Motivo mínimo 5 caracteres.'); return }
    const payload: UpdateVirtualAccountPayload = { reason: editVaForm.reason.trim() }
    let hasChanges = false
    const newFee = editVaForm.fee ? parseFloat(editVaForm.fee) : undefined
    if (newFee !== undefined && !isNaN(newFee) && newFee !== editingVa.developer_fee_percent) {
      if (newFee < 0 || newFee > 100) { toast.error('Fee debe estar entre 0 y 100.'); return }
      payload.developer_fee_percent = newFee; hasChanges = true
    }
    if (editVaForm.address.trim() && editVaForm.address.trim() !== (editingVa.destination_address ?? '')) { payload.destination_address = editVaForm.address.trim(); hasChanges = true }
    if (editVaForm.currency && editVaForm.currency !== editingVa.destination_currency) { payload.destination_currency = editVaForm.currency; hasChanges = true }
    if (editVaForm.payment_rail && editVaForm.payment_rail !== editingVa.destination_payment_rail) { payload.destination_payment_rail = editVaForm.payment_rail; hasChanges = true }
    if (!hasChanges) { toast.warning('No hay cambios para guardar.'); return }
    setSavingVa(true)
    try {
      await UsersAdminService.updateVirtualAccount(editingVa.id, payload)
      toast.success('VA actualizada correctamente en Bridge y DB.')
      closeEditVaModal(); loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar VA')
    } finally { setSavingVa(false) }
  }

  if (!canManage) return null

  // ── Helpers for the selected currency view ──
  const getOverrideCount = (currency: string) =>
    DEST_TYPES.filter((dt) => getFeeEntry(currency, dt)?.source === 'override').length

  const renderCurrencyFlag = (currency: string, width: number, height: number, className?: string) => (
    <Flag
      code={CURRENCY_FLAG_CODES[currency]}
      fallback={<span className="text-base leading-none">{CURRENCY_FLAGS[currency] ?? '🌐'}</span>}
      style={{ width, height, objectFit: 'cover' }}
      className={className}
    />
  )

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración de fees...
        </div>
      ) : (
        <div className="space-y-8">
          {/* ═══════════════════════════════════════════════════
              SECCIÓN 1 — MASTER-DETAIL: Matriz de Fees
             ═══════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
            <div className="flex min-h-[320px]">
              {/* ── Left Sidebar: Currency Selector ── */}
              <div className="w-[140px] shrink-0 border-r border-border/40 bg-muted/20">
                <div className="px-3 py-3 border-b border-border/30">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Moneda Origen</span>
                </div>
                <nav className="p-1.5 space-y-0.5">
                  {CURRENCIES.map((c) => {
                    const isActive = selectedCurrency === c
                    const overrides = getOverrideCount(c)
                    return (
                      <button
                        key={c}
                        onClick={() => { setSelectedCurrency(c); cancelEditCell() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-medium transition-all duration-150
                          ${isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
                          }`}
                      >
                        {renderCurrencyFlag(c, 20, 14, 'rounded-sm shrink-0')}
                        <span className="font-mono text-xs font-bold">{c.toUpperCase()}</span>
                        {overrides > 0 && (
                          <span className={`ml-auto text-[9px] font-bold rounded-full size-4 flex items-center justify-center
                            ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                            {overrides}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* ── Right Panel: Fee Detail for Selected Currency ── */}
              <div className="flex-1 min-w-0">
                <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {renderCurrencyFlag(selectedCurrency, 24, 16, 'rounded-sm shrink-0')}
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{selectedCurrency.toUpperCase()} — Configuración de Developer Fee</h4>
                      <p className="text-[11px] text-muted-foreground">Tarifa aplicada a las Virtual Accounts creadas con esta moneda de origen.</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {DEST_TYPES.map((dt) => {
                    const entry = getFeeEntry(selectedCurrency, dt)
                    const isOverride = entry?.source === 'override'
                    const isEditing = editingDestType === dt

                    return (
                      <div
                        key={dt}
                        className={`rounded-xl border p-4 transition-all duration-200
                          ${isOverride
                            ? 'border-amber-500/30 bg-amber-500/[0.03]'
                            : 'border-border/40 bg-muted/5'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{DEST_TYPE_ICONS[dt]}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{DEST_TYPE_LABELS[dt]}</span>
                                {isOverride ? (
                                  <Badge className="text-[9px] px-1.5 py-0 h-[18px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20">
                                    OVERRIDE
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] text-muted-foreground">
                                    POR DEFECTO
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isOverride ? 'Tarifa personalizada para este usuario.' : 'Usa la tarifa global del sistema.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Fee Display */}
                            <div className="text-right">
                              <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                                {entry?.resolved_fee != null ? entry.resolved_fee : '—'}
                              </span>
                              <span className="text-sm font-medium text-muted-foreground ml-0.5">%</span>
                            </div>

                            {/* Actions */}
                            {!isEditing && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditCell(dt)}
                                  className="h-8 text-xs gap-1.5 px-3"
                                >
                                  Establecer tarifa
                                </Button>
                                {isOverride && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleClearCellOverride(dt)}
                                    className="h-8 text-xs px-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Inline Edit Form ── */}
                        {isEditing && (
                          <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Nuevo fee (%)</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editCellFee}
                                    onChange={(e) => setEditCellFee(e.target.value)}
                                    className="h-10 text-sm font-mono pr-8"
                                    placeholder="0.00"
                                    autoFocus
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">%</span>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Motivo del cambio *</Label>
                                <Input
                                  value={editCellReason}
                                  onChange={(e) => setEditCellReason(e.target.value)}
                                  className="h-10 text-sm"
                                  placeholder="Ej: Cliente VIP — volumen alto"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Este override aplica solo a futuras VAs con {selectedCurrency.toUpperCase()}.
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={cancelEditCell} className="h-9 px-3 text-xs">
                                  Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSetCellOverride} disabled={savingCell} className="h-9 px-4 text-xs gap-1.5">
                                  {savingCell ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  <span>Guardar Override</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              SECCIÓN 2 — VAs Activas (Clean Data Table)
             ═══════════════════════════════════════════════════ */}
          {userVAs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Virtual Accounts Activas
                  <Badge variant="secondary" className="text-[10px] ml-1">{userVAs.length}</Badge>
                </h4>
              </div>

              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Par</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Dev Fee</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Dirección Destino</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Creada</th>
                      <th className="w-10 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {userVAs.map((va) => (
                      <tr key={va.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-xs bg-muted/40 px-2 py-0.5 rounded">
                            {va.source_currency.toUpperCase()} → {va.destination_currency.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={va.is_external_sweep ? 'secondary' : 'outline'} className="text-[10px]">
                            {va.is_external_sweep ? 'Externa' : 'Bridge'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold tabular-nums text-sm">
                            {va.developer_fee_percent != null ? `${va.developer_fee_percent}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {va.destination_address ? (
                            <span className="font-mono text-xs text-muted-foreground" title={va.destination_address}>
                              {va.destination_address.slice(0, 10)}…{va.destination_address.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{new Date(va.created_at).toLocaleDateString('es-BO')}</span>
                        </td>
                        <td className="px-2 py-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditVaModal(va)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Actualizar cuenta en Bridge"
                          >
                            <Percent className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              MODAL: Edición de VA activa
             ═══════════════════════════════════════════════════ */}
          <Dialog
            open={!!editingVa}
            onOpenChange={(open) => { if (!open) closeEditVaModal() }}
          >
            <DialogContent className="max-w-lg w-[95vw] sm:w-full">
              <DialogHeader className="mb-1">
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Actualizar Virtual Account
                </DialogTitle>
                <DialogDescription>
                  {editingVa && (
                    <>
                      Modifica los parámetros de la cuenta <strong className="font-mono">{editingVa.source_currency.toUpperCase()} → {editingVa.destination_currency.toUpperCase()}</strong>.
                      Los cambios se sincronizarán directamente con Bridge.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              {editingVa && (
                <div className="space-y-4">
                  {/* Current State Summary */}
                  <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Estado Actual</span>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Fee</span>
                        <span className="font-mono font-bold">{editingVa.developer_fee_percent != null ? `${editingVa.developer_fee_percent}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Moneda</span>
                        <span className="font-mono font-bold">{editingVa.destination_currency.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Tipo</span>
                        <span className="font-semibold">{editingVa.is_external_sweep ? 'Externa' : 'Bridge'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Fields */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nuevo Fee</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editVaForm.fee}
                            onChange={(e) => setEditVaForm(prev => ({ ...prev, fee: e.target.value }))}
                            placeholder={editingVa.developer_fee_percent != null ? String(editingVa.developer_fee_percent) : '0'}
                            className="h-10 text-sm font-mono pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">%</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Moneda Destino</Label>
                        <Select
                          value={editVaForm.currency}
                          onValueChange={(v) => setEditVaForm(prev => ({ ...prev, currency: v ?? '' }))}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder={editingVa.destination_currency.toUpperCase()} />
                          </SelectTrigger>
                          <SelectContent>
                            {DESTINATION_CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-sm">{c.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Red Destino</Label>
                        <Select
                          value={editVaForm.payment_rail}
                          onValueChange={(v) => setEditVaForm(prev => ({ ...prev, payment_rail: v ?? '' }))}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder={editingVa.destination_payment_rail ? (CRYPTO_NETWORK_LABELS[editingVa.destination_payment_rail as keyof typeof CRYPTO_NETWORK_LABELS] || editingVa.destination_payment_rail) : 'Seleccionar'} />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVE_CRYPTO_NETWORKS.map((net) => (
                              <SelectItem key={net} value={net} className="text-sm">{CRYPTO_NETWORK_LABELS[net as keyof typeof CRYPTO_NETWORK_LABELS]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dirección Destino</Label>
                      <Input
                        value={editVaForm.address}
                        onChange={(e) => setEditVaForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={editingVa.destination_address ?? '0x…'}
                        className="h-10 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Motivo del cambio *</Label>
                      <Textarea
                        value={editVaForm.reason}
                        onChange={(e) => setEditVaForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Ej: Cliente cambió wallet destino, acuerdo de fee VIP..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      Esta acción modifica la cuenta activa directamente en el servidor de Bridge.
                      Los cambios se reflejarán inmediatamente en las próximas transacciones.
                    </p>
                  </div>

                  {/* Footer */}
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={closeEditVaModal} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveVa}
                      disabled={savingVa}
                      className="flex-1 sm:flex-none gap-1.5"
                    >
                      {savingVa ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Guardar en Bridge</span>
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  )
}

function VaFeeOverrideDialog({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [open, setOpen] = useState(false)
  const canManage = actor.role === 'admin' || actor.role === 'super_admin'
  if (!canManage) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Percent className="h-3.5 w-3.5" />
        Fee Bridge VA
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-500" />
            Developer Fee — Virtual Accounts
          </DialogTitle>
          <DialogDescription>
            Gestiona el <code>developer_fee_percent</code> de Bridge para <strong>{user.full_name || user.email}</strong>.
            <br />
            <span className="text-[10px]">2 niveles: Override por usuario → Fee global por defecto.</span>
          </DialogDescription>
        </DialogHeader>
        {open ? <VaFeeOverridePanel actor={actor} user={user} /> : null}
      </DialogContent>
    </Dialog>
  )
}



export function ChangeRoleDialog({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
  const [open, setOpen] = useState(false)

  // Determinar roles asignables según el rol del actor
  const availableRoles = actor.role === 'super_admin'
    ? (['client', 'staff', 'admin', 'super_admin'] as const)
    : (['client', 'staff'] as const)

  // No mostrar si el actor intenta cambiar su propio rol
  const isSelf = actor.userId === user.id
  if (isSelf) return null

  const roleLabels: Record<string, { label: string; color: string }> = {
    client: { label: 'Cliente', color: 'text-blue-700 dark:text-blue-300' },
    staff: { label: 'Staff', color: 'text-emerald-700 dark:text-emerald-300' },
    admin: { label: 'Admin', color: 'text-amber-700 dark:text-amber-300' },
    super_admin: { label: 'Super Admin', color: 'text-rose-700 dark:text-rose-300' },
  }

  const form = useForm<AdminChangeRoleValues>({
    resolver: zodResolver(adminChangeRoleSchema),
    defaultValues: {
      role: user.role,
      reason: '',
    },
  })

  // Reset form when dialog opens with current user role
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      form.reset({ role: user.role, reason: '' })
    }
  }

  async function submit(values: AdminChangeRoleValues) {
    try {
      const { UsersAdminService } = await import('@/services/admin/users.admin.service')
      const updatedProfile = await UsersAdminService.updateRole(user.id, values.role, values.reason)
      toast.success(`Rol actualizado a "${roleLabels[values.role]?.label ?? values.role}".`)
      setOpen(false)
      form.reset()
      await onUpdated({ ...user, ...updatedProfile, role: values.role as Profile['role'] }, 'replace')
    } catch (error: any) {
      console.error('Failed to update role', error)
      const message = error?.response?.data?.message || error?.message || 'No se pudo cambiar el rol.'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button size="sm" variant="ghost" className="h-8 px-2 border border-transparent bg-primary/8 text-primary hover:bg-primary/14 hover:text-primary font-bold text-[10px] uppercase tracking-wider transition-all" />
      }>
        Cambiar rol
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="bg-primary/5 border-b border-primary/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Cambiar Rol</DialogTitle>
            <DialogDescription className="text-xs text-primary/80 font-medium">
              {user.full_name || user.email}
            </DialogDescription>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Rol actual:</div>
            <Badge variant="outline" className={`font-bold ${roleLabels[user.role]?.color ?? ''}`}>
              {roleLabels[user.role]?.label ?? user.role}
            </Badge>
          </div>

          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Nuevo Rol</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all">
                        <SelectValue placeholder="Selecciona un rol..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r} value={r} disabled={r === user.role}>
                            <span className={roleLabels[r]?.color ?? ''}>
                              {roleLabels[r]?.label ?? r}
                            </span>
                            {r === user.role ? <span className="ml-2 text-xs text-muted-foreground">(actual)</span> : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {actor.role !== 'super_admin' ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Solo un super_admin puede asignar roles admin o super_admin.
                    </p>
                  ) : null}
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Justificación del Cambio</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Indica el motivo de este cambio de rol..." className="min-h-[100px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="flex flex-col gap-3">
                <Button
                  disabled={form.formState.isSubmitting || form.watch('role') === user.role}
                  type="submit"
                  className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-full shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
                >
                  {form.formState.isSubmitting ? <><div className="size-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> Procesando...</> : 'Confirmar Cambio de Rol'}
                </Button>
                <div className="text-[10px] text-center text-muted-foreground italic flex items-center justify-center gap-1.5">
                  <AlertTriangle className="size-3" />
                  Esta acción se registra en auditoría y tiene efecto inmediato.
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ArchiveDeleteUserDialog({ action, actor, onUpdated, user }: { action: 'archive' | 'delete'; actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: AdminReasonValues) {
    try {
      await AdminService.archiveOrDeleteUser({ actor, user, action, reason: values.reason })
      toast.success(action === 'archive' ? 'Usuario archivado.' : 'Solicitud de eliminacion enviada.')
      setOpen(false)
      form.reset()
      await onUpdated(action === 'archive' ? { ...user, is_archived: true } : user, action === 'archive' ? 'replace' : 'remove')
    } catch (error) {
      console.error('Failed to archive/delete user', error)
      toast.error('No se pudo ejecutar la accion sobre el usuario.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={action === 'delete' ? 'destructive' : 'outline'} />}>{action === 'archive' ? 'Archivar' : 'Eliminar'}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>{action === 'archive' ? 'Archivar usuario' : 'Eliminar usuario'}</DialogTitle>
          <DialogDescription>
            Invoca \`admin-delete-user\` con accion \`{action}\` y registra auditoria local.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica esta accion" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit" variant={action === 'delete' ? 'destructive' : 'default'}>{form.formState.isSubmitting ? 'Guardando...' : 'Confirmar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function UnarchiveUserDialog({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: AdminReasonValues) {
    try {
      await AdminService.unarchiveUser({ actor, user, reason: values.reason })
      toast.success('Usuario desarchivado.')
      setOpen(false)
      form.reset()
      await onUpdated({ ...user, is_archived: false }, 'replace')
    } catch (error) {
      console.error('Failed to unarchive user', error)
      toast.error('No se pudo desarchivar el usuario.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Desarchivar</DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>Desarchivar usuario</DialogTitle>
          <DialogDescription>Invoca \`admin-unarchive-user\` y deja trazabilidad local.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica el desarchivo" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Desarchivar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordDialog({ actor, email, onUpdated }: { actor: StaffActor; email: string; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: AdminReasonValues) {
    try {
      await AdminService.resetPassword({ actor, email, reason: values.reason })
      toast.success('Reset de password solicitado.')
      setOpen(false)
      form.reset()
      await onUpdated(null, 'noop')
    } catch (error) {
      console.error('Failed to reset password', error)
      toast.error('No se pudo solicitar el reset de password.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Reset password</DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>Resetear password</DialogTitle>
          <DialogDescription>Invoca \`admin-reset-password\` y dispara el recovery al email del usuario.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica el reset" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Solicitar reset'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

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
}

export function FeeConfigDialog({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: FeeConfigRow) => Promise<void> | void; record: FeeConfigRow }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminFeeConfigValues>({
    resolver: zodResolver(adminFeeConfigSchema) as Resolver<AdminFeeConfigValues>,
    defaultValues: { 
      fee_type: (record.fee_type === 'percent' || record.fee_type === 'mixed' || record.fee_type === 'fixed') ? record.fee_type : 'percent',
      fee_percent: record.fee_percent ? Number(record.fee_percent) : 0,
      fee_fixed: record.fee_fixed ? Number(record.fee_fixed) : 0,
      min_fee: record.min_fee ? Number(record.min_fee) : 0,
      max_fee: record.max_fee ? Number(record.max_fee) : 0,
      is_active: record.is_active ?? true,
      reason: '' 
    },
  })

  const watchFeeType = form.watch('fee_type')
  const opLabel = record.operation_type ? (OPERATION_LABELS[record.operation_type] || record.operation_type) : 'Desconocida'

  async function submit(values: AdminFeeConfigValues) {
    try {
      const updatedRecord = await AdminService.updateFeeConfig({ 
        actor, 
        record, 
        reason: values.reason,
        data: {
          fee_type: values.fee_type,
          fee_percent: values.fee_percent,
          fee_fixed: values.fee_fixed,
          min_fee: values.min_fee,
          max_fee: values.max_fee,
          is_active: values.is_active
        }
      })
      toast.success('Parámetro de comisión actualizado.')
      setOpen(false)
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update fee config', error)
      toast.error('Error al actualizar la comisión.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 px-2 border border-transparent bg-amber-500/8 text-amber-700 hover:bg-amber-500/14 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 font-bold text-[10px] uppercase tracking-wider transition-all" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="bg-amber-500/5 border-b border-amber-500/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-sm dark:text-amber-300">
            <CircleDollarSign className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Ajustar Comisión Global</DialogTitle>
            <DialogDescription className="text-xs text-amber-700/80 font-medium dark:text-amber-300/80">
              Modificando ruta: <span className="text-amber-800 font-bold dark:text-amber-200">{opLabel}</span>
            </DialogDescription>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="font-mono text-[10px]">{record.payment_rail}</Badge>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Estado de Ruta</FormLabel>
                      <FormDescription className="text-[11px]">
                        Habilita o deshabilita los cobros para este tipo de operación global.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="fee_type" render={({ field }) => (
                  <FormItem className="col-span-2 space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Tipo de Comisión</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-10 bg-muted/20 border-border/60 font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="percent">Porcentaje</SelectItem>
                        <SelectItem value="fixed">Monto Fijo</SelectItem>
                        <SelectItem value="mixed">Mixto (Fijo + %)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                {(watchFeeType === 'percent' || watchFeeType === 'mixed') && (
                  <FormField control={form.control} name="fee_percent" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Porcentaje (%)</FormLabel>
                      <FormControl>
                        <Input {...field} min={0} step="0.01" type="number" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                )}

                {(watchFeeType === 'fixed' || watchFeeType === 'mixed') && (
                  <FormField control={form.control} name="fee_fixed" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Monto Fijo ($)</FormLabel>
                      <FormControl>
                        <Input {...field} min={0} step="0.01" type="number" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="min_fee" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Mínimo ($)</FormLabel>
                    <FormControl>
                      <Input {...field} min={0} step="0.01" type="number" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="max_fee" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Máximo ($)</FormLabel>
                    <FormControl>
                      <Input {...field} min={0} step="0.01" type="number" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Justificación del Cambio</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Indica el motivo de este ajuste..." className="min-h-[80px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="flex flex-col gap-3">
                <Button disabled={form.formState.isSubmitting} type="submit" className="w-full font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 h-10 rounded-full shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2">
                  {form.formState.isSubmitting ? <><div className="size-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> Procesando...</> : 'Guardar y Aplicar'}
                </Button>
                <div className="text-[10px] text-center text-muted-foreground italic">
                  Este ajuste será registrado en la auditoría del sistema.
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AppSettingDialog({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: AppSettingRow) => Promise<void> | void; record: AppSettingRow }) {
  const [open, setOpen] = useState(false)
  const valueKind = getAppSettingValueKind(record.value)
  const form = useForm<AdminAppSettingValues>({
    resolver: zodResolver(adminAppSettingSchema),
    defaultValues: { value: formatAppSettingValue(record.value), reason: '' },
  })

  async function submit(values: AdminAppSettingValues) {
    try {
      const nextValue = parseAppSettingValue(values.value, record.value)
      const updatedRecord = await AdminService.updateAppSetting({ actor, record, value: nextValue, reason: values.reason })
      toast.success('Variable de sistema actualizada.')
      setOpen(false)
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update app setting', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la variable.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 px-2 border border-transparent bg-cyan-500/8 text-sky-700 hover:bg-cyan-500/14 hover:text-sky-800 dark:text-cyan-300 dark:hover:text-cyan-200 font-bold text-[10px] uppercase tracking-wider transition-all" />}>
        Configurar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="bg-cyan-400/5 border-b border-cyan-400/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center text-sky-700 shadow-sm dark:text-cyan-300">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Variable de Entorno</DialogTitle>
            <DialogDescription className="text-xs text-sky-700/80 font-mono font-bold uppercase break-all dark:text-cyan-300/80">
              {String(record.key ?? record.name ?? 'CONFIG_VAR')}
            </DialogDescription>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="bg-cyan-400/5 text-[10px] border-cyan-400/20 text-sky-700 font-bold uppercase tracking-tighter px-2 py-0 dark:text-cyan-300">
              Type: {valueKind}
            </Badge>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Valor de la Variable</FormLabel>
                    <span className="text-[10px] text-muted-foreground font-medium italic">Editor Seguro</span>
                  </div>
                  <FormControl>
                    <div className="relative group/editor">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/20 group-focus-within/editor:bg-cyan-400 transition-colors rounded-l-md" />
                      <Textarea 
                        {...field} 
                        className="min-h-[140px] font-mono text-[13px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none pl-4 leading-relaxed" 
                      />
                    </div>
                  </FormControl>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/40">
                    <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-2">
                      <Bell className="size-3 text-sky-600/70 dark:text-cyan-300/60" />
                      <span>{getAppSettingHelpText(valueKind)}</span>
                    </p>
                  </div>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Bitácora Operativa</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detalla el impacto de este cambio..." className="min-h-[80px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="pt-2">
                <Button disabled={form.formState.isSubmitting} type="submit" className="w-full font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 h-10 rounded-full shadow-lg shadow-cyan-400/10 transition-all flex items-center justify-center gap-2">
                  {form.formState.isSubmitting ? <><div className="size-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> Sincronizando...</> : 'Guardar Cambios Críticos'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PsavCreateDialog({ actor, onUpdated }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void }) {
  return <PsavUpsertDialog actor={actor} label="Nuevo PSAV" onUpdated={onUpdated} />
}

function PsavUpsertDialog({ actor, label, onUpdated, record }: { actor: StaffActor; label: string; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void; record?: PsavConfigRow }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(record?.qr_url as string || null)
  
  const form = useForm<AdminPsavRecordValues>({
    resolver: zodResolver(adminPsavRecordSchema),
    defaultValues: {
      name: (record?.name as string) ?? '',
      type: (record?.type as 'bank_bo' | 'bank_us' | 'crypto') ?? 'bank_bo',
      bank_name: (record?.bank_name as string) ?? '',
      account_number: (record?.account_number as string) ?? '',
      routing_number: (record?.routing_number as string) ?? '',
      account_holder: (record?.account_holder as string) ?? '',
      crypto_address: (record?.crypto_address as string) ?? '',
      crypto_network: (record?.crypto_network as string) ?? '',
      currency: (record?.currency as string) ?? '',
      is_active: record?.is_active ?? true,
      reason: '',
    },
  })

  // Watch fields for live preview
  const watchedName = form.watch('name')
  const watchedType = form.watch('type')
  const watchedBank = form.watch('bank_name')
  const watchedAccount = form.watch('account_number')
  const watchedCurrency = form.watch('currency')

  // Auto-populate currency when type changes (only for new records or when currency is empty/default)
  useEffect(() => {
    const currencyMap: Record<string, string> = { bank_bo: 'BOB', bank_us: 'USD', crypto: 'USDT' }
    const autoCurrency = currencyMap[watchedType] ?? ''
    const currentCurrency = form.getValues('currency')
    // Only auto-set if the field is empty or if it matches another auto-value (user hasn't typed custom)
    const autoValues = Object.values(currencyMap)
    if (!currentCurrency || autoValues.includes(currentCurrency)) {
      form.setValue('currency', autoCurrency)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType])

  async function submit(values: AdminPsavRecordValues) {
    try {
      let qrUrl = record?.qr_url
      if (file) {
        const supabase = createClient()
        const extension = safeFileExtension(file.name)
        const path = `psav/${Date.now()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
        qrUrl = data.publicUrl
      }

      const payload: Record<string, unknown> = {
        name: values.name,
        type: values.type,
        bank_name: values.bank_name,
        account_number: values.account_number,
        routing_number: values.routing_number,
        account_holder: values.account_holder,
        crypto_address: values.crypto_address,
        crypto_network: values.crypto_network,
        currency: values.currency,
        is_active: values.is_active,
        qr_url: qrUrl,
      }
      if (record?.id) payload.id = record.id

      const updatedRecord = await AdminService.upsertPsavConfig({ actor, payload, reason: values.reason })
      toast.success(record ? 'PSAV actualizado correctamente.' : 'PSAV creado con éxito.')
      setOpen(false)
      setFile(null)
      await onUpdated(updatedRecord, 'replace')
    } catch (error) {
      console.error('Failed to upsert psav config', error)
      toast.error('Error al guardar configuración. Verifica banca y archivos.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={record ? "ghost" : "default"} className={record ? "h-8 px-2 hover:bg-muted font-medium text-xs shadow-none border-none" : "h-9 px-4 font-semibold shadow-sm transition-all hover:scale-[1.02]"} />}>
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">
          {/* Form Side */}
          <div className="p-5 md:p-8 space-y-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {record ? 'Refinar Configuración PSAV' : 'Nuevo Canal de Pago'}
              </DialogTitle>
              <DialogDescription className="text-sm break-words">
                Define los detalles del banco y el código QR para depósitos directos.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Nombre del Canal</FormLabel>
                      <FormControl><Input {...field} placeholder="Punto de Pago, etc." className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Tipo Operativo</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all">
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_bo">Banco BO</SelectItem>
                            <SelectItem value="bank_us">Banco US</SelectItem>
                            <SelectItem value="crypto">Wallet Crypto</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                </div>

                {watchedType !== 'crypto' ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="bank_name" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[13px] font-semibold text-foreground/80">Entidad Bancaria</FormLabel>
                          <FormControl><Input {...field} placeholder="Banco de ejemplo" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="account_number" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[13px] font-semibold text-foreground/80">Número de Cuenta</FormLabel>
                          <FormControl><Input {...field} placeholder="000-000-000" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                    </div>
                    {watchedType === 'bank_us' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="routing_number" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[13px] font-semibold text-foreground/80">Routing Number (ABA)</FormLabel>
                            <FormControl><Input {...field} placeholder="021000021" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all font-mono" /></FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="account_holder" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[13px] font-semibold text-foreground/80">Titular de la Cuenta</FormLabel>
                            <FormControl><Input {...field} placeholder="Nombre completo o empresa" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                      </div>
                    )}
                    {watchedType === 'bank_bo' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="account_holder" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[13px] font-semibold text-foreground/80">Titular de la Cuenta</FormLabel>
                            <FormControl><Input {...field} placeholder="Nombre completo o empresa" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="crypto_network" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-semibold text-foreground/80">Red Crypto</FormLabel>
                        <FormControl><Input {...field} placeholder="TRC20, ERC20" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="crypto_address" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[13px] font-semibold text-foreground/80">Address (Wallet)</FormLabel>
                        <FormControl><Input {...field} placeholder="0x..." className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Divisa</FormLabel>
                      <FormControl><Input {...field} placeholder="BOB, USD, USDT..." className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1">Se establece automáticamente según el tipo, pero puedes modificarla.</p>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-foreground/80">Credencial QR</Label>
                  <div className="relative group/file">
                    <Input 
                      type="file" 
                      accept={ACCEPTED_UPLOADS} 
                      onChange={handleFileChange}
                      className="cursor-pointer file:cursor-pointer h-10 bg-muted/20 border-border/60 file:bg-foreground/5 file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:text-foreground/80 file:mr-4 hover:border-foreground/20 transition-all" 
                    />
                  </div>
                </div>

                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Visibilidad Operativa</FormLabel>
                      <p className="text-[12px] text-muted-foreground">Determina si los usuarios ven esta opción.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-400" />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Bitácora de Cambio</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Motivo de la actualización..." className="min-h-[80px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" /></FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />

                <DialogFooter className="pt-2">
                  <Button disabled={form.formState.isSubmitting} type="submit" className="w-full sm:w-auto font-bold bg-foreground text-background hover:bg-foreground/90 h-10 px-8 rounded-full shadow-lg shadow-foreground/10 transition-all flex items-center gap-2">
                    {form.formState.isSubmitting ? <><div className="size-3 border-2 border-background/30 border-t-background animate-spin rounded-full" /> Guardando...</> : record ? 'Actualizar PSAV' : 'Crear Canal'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>

          {/* Preview Side */}
          <div className="bg-muted/40 border-t md:border-t-0 md:border-l border-border/40 p-6 pb-8 md:pb-6 flex flex-col items-center space-y-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground w-full text-center">Previsualización</div>
            
            <div className="w-full max-w-[240px] md:max-w-none aspect-square rounded-2xl bg-card shadow-xl shadow-black/10 border border-border/50 flex flex-col items-center justify-center p-6 space-y-4 relative overflow-hidden group mx-auto">
              <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
              
              {previewUrl ? (
                <>
                  {/* Vista previa con blob/object URL o URL externa dinámica. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                  src={previewUrl} 
                  alt="QR Preview" 
                  className="w-full h-full object-contain transition-transform group-hover:scale-105" 
                  />
                </>
              ) : (
                <div className="flex flex-col items-center text-center space-y-2 text-muted-foreground/40">
                  <div className="size-12 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div className="text-[11px] font-medium leading-tight">Sin QR<br/>cargado</div>
                </div>
              )}
            </div>

            <div className="w-full space-y-3 px-1">
              <div className="space-y-1 border-b border-border/30 pb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Concepto</div>
                <div className="text-sm font-extrabold truncate text-foreground/90">{watchedName || 'Nombre del Canal'}</div>
              </div>
              <div className="space-y-1 border-b border-border/30 pb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Banco</div>
                <div className="text-sm font-semibold truncate text-foreground/90">{watchedBank || 'Banco Ejemplo'}</div>
              </div>
              <div className="space-y-1 border-b border-border/30 pb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Cuenta ({watchedCurrency || 'CUR'})</div>
                <div className="text-xs font-mono font-medium text-foreground/70">{watchedAccount || '0000 0000 0000'}</div>
              </div>
              {watchedType === 'bank_us' && form.watch('routing_number') && (
                <div className="space-y-1 border-b border-border/30 pb-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Routing (ABA)</div>
                  <div className="text-xs font-mono font-medium text-foreground/70">{form.watch('routing_number')}</div>
                </div>
              )}
              {form.watch('account_holder') && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Titular</div>
                  <div className="text-xs font-semibold truncate text-foreground/70">{form.watch('account_holder')}</div>
                </div>
              )}
            </div>

            <div className="flex-1" />
            
            <div className="w-full p-3 rounded-xl bg-amber-400/8 border border-amber-400/15 text-[11px] text-amber-800/80 italic leading-relaxed text-center dark:text-amber-200/80">
              Asegúrate de que el QR sea legible y los datos bancarios exactos.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PsavConfigDialogs({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void; record: PsavConfigRow }) {
  return (
    <div className="flex items-center gap-1.5">
      <PsavUpsertDialog actor={actor} label="Editar" onUpdated={onUpdated} record={record} />
      <div className="w-px h-3 bg-border/40 mx-0.5" />
      <PsavDeleteDialog actor={actor} onUpdated={onUpdated} record={record} />
    </div>
  )
}

function PsavDeleteDialog({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void; record: PsavConfigRow }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: AdminReasonValues) {
    try {
      await AdminService.deletePsavConfig({ actor, record, reason: values.reason })
      toast.success('Canal PSAV eliminado del sistema.')
      setOpen(false)
      form.reset()
      await onUpdated(record, 'remove')
    } catch (error) {
      console.error('Failed to delete psav config', error)
      toast.error('Error al eliminar. Trazabilidad guardada.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all" />}>
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-destructive/20 shadow-2xl">
        <div className="p-5 md:p-8 flex flex-col items-center text-center space-y-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-destructive">¿Eliminar este canal?</DialogTitle>
            <DialogDescription className="text-sm">
              Esta acción es irreversible. El canal <span className="font-semibold text-foreground break-all">&quot;{record.name}&quot;</span> dejará de estar disponible para todos los usuarios.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="w-full space-y-5" onSubmit={form.handleSubmit(submit)}>
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Motivo de la Eliminación</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Justifica esta acción crítica..." className="min-h-[100px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)} className="h-10 font-bold rounded-full">
                  Cancelar
                </Button>
                <Button disabled={form.formState.isSubmitting} type="submit" variant="destructive" className="h-10 font-bold rounded-full shadow-lg shadow-destructive/10 flex items-center gap-2">
                  {form.formState.isSubmitting ? <><div className="size-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> Borrando...</> : 'Borrador Definitivo'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatAppSettingValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value ?? null, null, 2)
}

function getAppSettingValueKind(value: unknown) {
  if (value === null) return 'json'
  if (Array.isArray(value)) return 'json'
  if (typeof value === 'object') return 'json'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

function getAppSettingHelpText(kind: ReturnType<typeof getAppSettingValueKind>) {
  switch (kind) {
    case 'boolean':
      return 'Usa \`true\` o \`false\` para conservar el tipo booleano.'
    case 'number':
      return 'Ingresa un numero valido; se guardara como numero, no como texto.'
    case 'json':
      return 'Mantiene el valor como JSON. Usa un objeto, arreglo, numero, booleano o \`null\` valido.'
    default:
      return 'Este valor se guardara como texto.'
  }
}

function parseAppSettingValue(rawValue: string, previousValue: unknown) {
  const kind = getAppSettingValueKind(previousValue)
  const trimmed = rawValue.trim()

  switch (kind) {
    case 'boolean':
      if (trimmed !== 'true' && trimmed !== 'false') {
        throw new Error('El valor debe ser \`true\` o \`false\`.')
      }
      return trimmed === 'true'
    case 'number': {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) {
        throw new Error('El valor debe ser numerico.')
      }
      return parsed
    }
    case 'json':
      try {
        return JSON.parse(trimmed)
      } catch {
        throw new Error('El valor debe ser JSON valido para conservar su tipo actual.')
      }
    default:
      return rawValue
  }
}

export function RateConfigDialog({
  actor,
  onUpdated,
  record,
}: {
  actor: StaffActor
  onUpdated: (record: ExchangeRatePair) => Promise<void> | void
  record: ExchangeRatePair
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminRateConfigValues>({
    resolver: zodResolver(adminRateConfigSchema) as any,
    defaultValues: {
      rate: record.rate,
      spread_percent: record.spread_percent ?? 0,
    },
  })

  async function submit(values: AdminRateConfigValues) {
    try {
      const pairId = (record as any).pair || `${record.from_currency}_${record.to_currency}`
      const updatedRecord = await ConfigAdminService.updateExchangeRate(
        pairId,
        values.rate,
        values.spread_percent
      )
      toast.success('Tipo de cambio actualizado.')
      setOpen(false)
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update exchange rate', error)
      toast.error('Error al actualizar el tipo de cambio.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 border border-transparent bg-amber-500/8 text-amber-700 hover:bg-amber-500/14 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 font-bold text-[10px] uppercase tracking-wider transition-all"
          />
        }
      >
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="bg-amber-500/5 border-b border-amber-500/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-sm dark:text-amber-300">
            <CircleDollarSign className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Ajustar Tasa: {(record as any).pair || `${record.from_currency}_${record.to_currency}`}</DialogTitle>
            <DialogDescription className="text-xs text-amber-700/80 font-medium dark:text-amber-300/80">
              Modificando la base y el spread porcentual.
            </DialogDescription>
          </div>
        </div>
        <div className="p-6 md:p-8 pt-6">
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Tasa Base Comercial</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.0001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spread_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Margen (Spread) %</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground mt-1">Margen comercial de conversión.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t border-border/40 sm:justify-between items-center w-full">
                <Button
                  variant="ghost"
                  className="font-bold hidden sm:flex"
                  onClick={(e) => {
                    e.preventDefault()
                    setOpen(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={form.formState.isSubmitting}
                  type="submit"
                  className="font-bold flex-1 sm:flex-none shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                >
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                      Guardando...
                    </span>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * BankAccountReviewPanel — Standalone panel for bank account review.
 * Can be rendered inline (user detail page) or inside a Dialog wrapper.
 */
export function BankAccountReviewPanel({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [accounts, setAccounts] = useState<PendingBankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null)

  const canManage = actor.role === 'admin' || actor.role === 'super_admin' || actor.role === 'staff'

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await BankAccountsAdminService.getByUser(user.id)
      setAccounts(data as PendingBankAccount[])
    } catch {
      toast.error('Error al cargar cuentas bancarias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
    setShowRejectForm(null)
    setRejectReason('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleApprove = async (accountId: string) => {
    setActionLoading(true)
    try {
      await BankAccountsAdminService.approve(accountId)
      toast.success('Cambio de cuenta bancaria aprobado.')
      loadAccounts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aprobar'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (accountId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Debes indicar una razón para el rechazo.')
      return
    }
    setActionLoading(true)
    try {
      await BankAccountsAdminService.reject(accountId, rejectReason.trim())
      toast.success('Solicitud de cambio rechazada.')
      setShowRejectForm(null)
      setRejectReason('')
      loadAccounts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  if (!canManage) return null

  return (
    <>
      {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-xl border border-dashed border-border/60">
            Este usuario no tiene cuenta bancaria registrada.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acct) => {
              const isPending = acct.status === 'pending_approval'
              return (
                <div
                  key={acct.id}
                  className={`rounded-xl border p-4 space-y-4 transition-colors ${
                    isPending
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-muted/10 border-border/60'
                  }`}
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <Badge variant="secondary" className="gap-1 text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          Cambio pendiente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Activa
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase tracking-widest">{acct.currency}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{acct.id.slice(0, 8)}</span>
                  </div>

                  {/* Current data */}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Datos actuales</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="text-sm"><span className="text-xs text-muted-foreground block mb-0.5">Banco:</span> <span className="font-medium">{acct.bank_name}</span></div>
                      <div className="text-sm"><span className="text-xs text-muted-foreground block mb-0.5">Cuenta:</span> <span className="font-medium font-mono">{acct.account_number}</span></div>
                      <div className="text-sm"><span className="text-xs text-muted-foreground block mb-0.5">Titular:</span> <span className="font-medium">{acct.account_holder}</span></div>
                    </div>
                  </div>

                  {/* Pending changes comparison */}
                  {isPending && acct.pending_changes && (
                    <div className="border-t border-amber-500/10 pt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400 mb-2">Cambios solicitados</div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {acct.pending_changes.bank_name && (
                          <div className="text-sm">
                            <span className="text-xs text-muted-foreground block mb-0.5">Banco:</span>
                            <span className="font-medium text-amber-700 dark:text-amber-400">{acct.pending_changes.bank_name}</span>
                          </div>
                        )}
                        {acct.pending_changes.account_number && (
                          <div className="text-sm">
                            <span className="text-xs text-muted-foreground block mb-0.5">Cuenta:</span>
                            <span className="font-medium font-mono text-amber-700 dark:text-amber-400">{acct.pending_changes.account_number}</span>
                          </div>
                        )}
                        {acct.pending_changes.account_holder && (
                          <div className="text-sm">
                            <span className="text-xs text-muted-foreground block mb-0.5">Titular:</span>
                            <span className="font-medium text-amber-700 dark:text-amber-400">{acct.pending_changes.account_holder}</span>
                          </div>
                        )}
                        {acct.pending_changes.account_type && (
                          <div className="text-sm">
                            <span className="text-xs text-muted-foreground block mb-0.5">Tipo:</span>
                            <span className="font-medium text-amber-700 dark:text-amber-400">
                              {acct.pending_changes.account_type === 'savings' ? 'Caja de ahorro' : 'Cuenta corriente'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Motivo del cambio */}
                      {acct.change_reason && (
                        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400 mb-1">Motivo del cliente</div>
                          <p className="text-sm text-foreground leading-relaxed">{acct.change_reason}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleApprove(acct.id)}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar cambio
                        </Button>
                        {showRejectForm === acct.id ? (
                          <div className="w-full mt-2 space-y-2">
                            <Textarea
                              placeholder="Razón del rechazo (obligatorio)..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              rows={2}
                              className="text-sm resize-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading || !rejectReason.trim()}
                                onClick={() => handleReject(acct.id)}
                                className="gap-1.5"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Confirmar rechazo
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowRejectForm(null)
                                  setRejectReason('')
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => setShowRejectForm(acct.id)}
                            className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazar
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No pending — info only */}
                  {!isPending && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Sin solicitudes de cambio pendientes.
                      {acct.last_change_requested_at && (
                        <span> · Último cambio solicitado: {new Date(acct.last_change_requested_at).toLocaleDateString('es-BO')}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </>
  )
}

function BankAccountReviewDialog({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [open, setOpen] = useState(false)
  const canManage = actor.role === 'admin' || actor.role === 'super_admin' || actor.role === 'staff'
  if (!canManage) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Landmark className="h-3.5 w-3.5" />
        Cuenta bancaria
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Cuenta Bancaria — {user.full_name || user.email}
          </DialogTitle>
          <DialogDescription>
            Gestiona la cuenta bancaria de este usuario. Revisa y aprueba o rechaza solicitudes de cambio.
          </DialogDescription>
        </DialogHeader>
        {open ? <BankAccountReviewPanel actor={actor} user={user} /> : null}
      </DialogContent>
    </Dialog>
  )
}

// ── Etiquetas legibles para flow types ───────────────────────────────────────
const FLOW_TYPE_LABELS: Record<string, string> = {
  bolivia_to_world:          'Bolivia → Exterior (1.1)',
  bolivia_to_wallet:         'Bolivia → Wallet (1.3)',
  wallet_to_wallet:          'Wallet → Wallet (1.2)',
  world_to_bolivia:          'Exterior → Bolivia (1.4)',
  fiat_bo_to_bridge_wallet:  'Fiat BO → Bridge Wallet (2.1)',
  crypto_to_bridge_wallet:   'Crypto → Bridge Wallet (2.2)',
  bridge_wallet_to_fiat_bo:  'Bridge Wallet → Fiat BO (2.4)',
  bridge_wallet_to_crypto:   'Bridge Wallet → Crypto (2.5)',
  bridge_wallet_to_fiat_us:  'Bridge Wallet → Fiat US (2.6)',
}

// ═════════════════════════════════════════════════════════════════════════════
//  LimitOverridesPanel — Límites personalizados de monto por cliente VIP
// ═════════════════════════════════════════════════════════════════════════════
export function LimitOverridesPanel({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [overrides, setOverrides] = useState<LimitOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const canManage = actor.role === 'admin' || actor.role === 'super_admin'
  const canDelete = actor.role === 'super_admin'

  const form = useForm<AdminLimitOverrideValues>({
    resolver: zodResolver(adminLimitOverrideSchema) as Resolver<AdminLimitOverrideValues>,
    defaultValues: {
      flow_type: 'bolivia_to_world',
      min_usd: undefined,
      max_usd: undefined,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      notes: '',
    },
  })

  const loadOverrides = async () => {
    setLoading(true)
    try {
      const data = await UsersAdminService.getLimitOverrides(user.id)
      setOverrides(data)
    } catch {
      toast.error('Error al cargar límites personalizados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const handleToggle = async (override: LimitOverride) => {
    try {
      await UsersAdminService.updateLimitOverride(override.id, { is_active: !override.is_active })
      toast.success(override.is_active ? 'Override desactivado' : 'Override activado')
      loadOverrides()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      toast.error(msg)
    }
  }

  const handleDelete = async (override: LimitOverride) => {
    if (!confirm(`¿Eliminar permanentemente el override de límite para "${FLOW_TYPE_LABELS[override.flow_type] ?? override.flow_type}"?`)) return
    try {
      await UsersAdminService.deleteLimitOverride(override.id)
      toast.success('Override eliminado')
      loadOverrides()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const onSubmit = async (values: AdminLimitOverrideValues) => {
    setCreating(true)
    try {
      const payload: CreateLimitOverridePayload = {
        user_id: user.id,
        flow_type: values.flow_type,
        ...(values.min_usd != null ? { min_usd: values.min_usd } : {}),
        ...(values.max_usd != null ? { max_usd: values.max_usd } : {}),
        valid_from: values.valid_from || new Date().toISOString().split('T')[0],
        ...(values.valid_until ? { valid_until: values.valid_until } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      }
      await UsersAdminService.createLimitOverride(payload)
      toast.success('Límite personalizado creado')
      form.reset()
      setShowForm(false)
      loadOverrides()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear override'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  if (!canManage) return null

  return (
    <>
      {/* ── Lista de overrides existentes ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Límites Personalizados</h4>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5 text-xs">
            {showForm ? 'Cancelar' : '+ Nuevo Límite'}
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-6">Cargando...</div>
        ) : overrides.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
            Sin límites personalizados. Este usuario usa los límites globales.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {overrides.map((o) => (
              <div key={o.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${o.is_active ? 'bg-blue-500/5 border-blue-500/20' : 'bg-muted/20 border-border/40 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={o.is_active ? 'default' : 'secondary'} className="text-[10px] font-mono">
                      {FLOW_TYPE_LABELS[o.flow_type] ?? o.flow_type}
                    </Badge>
                    {o.min_usd != null && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Mín: ${o.min_usd}</span>
                    )}
                    {o.max_usd != null && (
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Máx: ${o.max_usd}</span>
                    )}
                  </div>
                  {o.notes && <div className="text-xs text-muted-foreground mt-1 truncate">{o.notes}</div>}
                  {o.valid_until && <div className="text-[10px] text-muted-foreground mt-0.5">Vigente hasta: {o.valid_until}</div>}
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={o.is_active}
                      onCheckedChange={() => handleToggle(o)}
                      className="scale-75"
                    />
                    <span className="text-[10px] text-muted-foreground w-7">{o.is_active ? 'ON' : 'OFF'}</span>
                  </div>
                  {canDelete && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(o)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Formulario para crear nuevo override ── */}
      {showForm && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h4 className="text-sm font-semibold text-foreground mb-3">Crear Nuevo Límite</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Servicio */}
              <FormField control={form.control} name="flow_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Servicio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(FLOW_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                {/* Mínimo USD */}
                <FormField control={form.control} name="min_usd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mínimo (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Ej: 50"
                        className="h-9 text-xs"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Máximo USD */}
                <FormField control={form.control} name="max_usd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Máximo (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Ej: 100000"
                        className="h-9 text-xs"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Válido desde */}
                <FormField control={form.control} name="valid_from" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Válido desde</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9 text-xs" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Válido hasta */}
                <FormField control={form.control} name="valid_until" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Válido hasta (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9 text-xs" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Notas */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notas / Justificación</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Cliente VIP con volumen mensual alto. Aprobado por gerencia."
                      className="text-xs resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" size="sm" disabled={creating} className="w-full gap-1.5">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
                {creating ? 'Creando...' : 'Crear Límite Personalizado'}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </>
  )
}

