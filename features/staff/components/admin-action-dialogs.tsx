'use client'

import React, { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/browser'
import { Label } from '@/components/ui/label'
import { ACCEPTED_UPLOADS, safeFileExtension } from '@/lib/file-validation'
import {
  ShieldCheck,
  CircleDollarSign,
  AlertTriangle,
  Bell,
  Trash2,
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
import { UsersAdminService, type FeeOverride } from '@/services/admin/users.admin.service'
import {
  adminAppSettingSchema,
  adminCreateUserSchema,
  adminFeeConfigSchema,
  adminReasonSchema,
  adminPsavRecordSchema,
  adminChangeRoleSchema,
  adminFeeOverrideSchema,
  type AdminAppSettingValues,
  type AdminCreateUserValues,
  type AdminFeeConfigValues,
  type AdminReasonValues,
  type AdminPsavRecordValues,
  type AdminChangeRoleValues,
  type AdminFeeOverrideValues,
} from '@/features/staff/schemas/admin-actions.schema'
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

function FeeOverridesDialog({ actor, user }: { actor: StaffActor; user: Profile }) {
  const [open, setOpen] = useState(false)
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
      valid_until: '',
      notes: '',
    },
  })

  const watchFeeType = form.watch('fee_type')

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
    if (open) loadOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Payment rail */}
                  <FormField control={form.control} name="payment_rail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Payment Rail</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
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
        <Button size="sm" variant="ghost" className="h-8 px-2 border border-transparent bg-violet-500/8 text-violet-700 hover:bg-violet-500/14 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200 font-bold text-[10px] uppercase tracking-wider transition-all" />
      }>
        Cambiar rol
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] w-[95vw] sm:w-full gap-0 p-0 max-h-[92vh] overflow-y-auto border-border/40 shadow-2xl">
        <div className="bg-violet-500/5 border-b border-violet-500/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-700 shadow-sm dark:text-violet-300">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Cambiar Rol</DialogTitle>
            <DialogDescription className="text-xs text-violet-700/80 font-medium dark:text-violet-300/80">
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
                  className="w-full font-bold bg-violet-500 text-white hover:bg-violet-400 h-10 rounded-full shadow-lg shadow-violet-500/10 transition-all flex items-center justify-center gap-2"
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

function ArchiveDeleteUserDialog({ action, actor, onUpdated, user }: { action: 'archive' | 'delete'; actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
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

function UnarchiveUserDialog({ actor, onUpdated, user }: { actor: StaffActor; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void; user: Profile }) {
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

function ResetPasswordDialog({ actor, email, onUpdated }: { actor: StaffActor; email: string; onUpdated: (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => Promise<void> | void }) {
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
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/50 via-cyan-400/50 to-violet-400/50" />
              
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
