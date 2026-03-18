'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
  CheckCircle2,
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
import {
  adminAppSettingSchema,
  adminCreateUserSchema,
  adminFeeConfigSchema,
  adminJsonRecordSchema,
  adminReasonSchema,
  adminPsavRecordSchema,
  type AdminAppSettingValues,
  type AdminCreateUserValues,
  type AdminFeeConfigValues,
  type AdminJsonRecordValues,
  type AdminReasonValues,
  type AdminPsavRecordValues,
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
      <DialogContent>
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
                <FormControl><Input {...field} type="password" /></FormControl>
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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle>Administrar Usuario</DialogTitle>
          <DialogDescription>Gestión de identidad y seguridad de acceso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/70">
            <div><span className="text-muted-foreground block text-xs">Nombre:</span> <span className="font-medium">{user.full_name || 'Sin nombre'}</span></div>
            <div><span className="text-muted-foreground block text-xs">Email:</span> <span className="font-medium">{user.email}</span></div>
            <div><span className="text-muted-foreground block text-xs">Rol:</span> <Badge variant="outline">{user.role}</Badge></div>
            <div><span className="text-muted-foreground block text-xs">Archivado:</span> <span className={"font-semibold " + (user.is_archived ? "text-amber-300" : "text-emerald-400")}>{user.is_archived ? 'Sí' : 'No'}</span></div>
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
      <DialogContent>
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
      <DialogContent>
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
      <DialogContent>
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

export function FeeConfigDialog({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: FeeConfigRow) => Promise<void> | void; record: FeeConfigRow }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminFeeConfigValues>({
    resolver: zodResolver(adminFeeConfigSchema) as Resolver<AdminFeeConfigValues>,
    defaultValues: { value: record.value, currency: record.currency, reason: '' },
  })

  async function submit(values: AdminFeeConfigValues) {
    try {
      const updatedRecord = await AdminService.updateFeeConfig({ actor, record, value: values.value, currency: values.currency, reason: values.reason })
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
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-amber-500/10 hover:text-amber-600 font-bold text-[10px] uppercase tracking-wider transition-all" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] gap-0 p-0 overflow-hidden border-border/40 shadow-2xl">
        <div className="bg-amber-500/5 border-b border-amber-500/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
            <CircleDollarSign className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Ajustar Comisión</DialogTitle>
            <DialogDescription className="text-xs text-amber-600/70 font-medium">
              Modificando: <span className="text-amber-700 font-bold">{record.type}</span>
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Valor Numérico</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} min={0} step="0.01" type="number" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all pr-8 font-bold" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60">
                          {record.fee_type === 'percentage' ? '%' : record.currency}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-semibold text-foreground/80">Divisa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="P. ej: BOB" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all font-mono uppercase" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-semibold text-foreground/80">Justificación del Cambio</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Indica el motivo de este ajuste..." className="min-h-[100px] bg-muted/20 border-border/60 focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />

              <div className="flex flex-col gap-3">
                <Button disabled={form.formState.isSubmitting} type="submit" className="w-full font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 h-10 rounded-full shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2">
                  {form.formState.isSubmitting ? <><div className="size-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> Procesando...</> : 'Actualizar Parámetros'}
                </Button>
                <div className="text-[10px] text-center text-muted-foreground italic">
                  Este ajuste afecta los cálculos de todas las órdenes futuras.
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
      <DialogTrigger render={<Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-cyan-400/10 hover:text-cyan-300 font-bold text-[10px] uppercase tracking-wider transition-all" />}>
        Configurar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-hidden border-border/40 shadow-2xl">
        <div className="bg-cyan-400/5 border-b border-cyan-400/10 p-6 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center text-cyan-300 shadow-sm">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">Variable de Entorno</DialogTitle>
            <DialogDescription className="text-xs text-cyan-300/70 font-mono font-bold uppercase">
              {String(record.key ?? record.name ?? 'CONFIG_VAR')}
            </DialogDescription>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="bg-cyan-400/5 text-[10px] border-cyan-400/20 text-cyan-300 font-bold uppercase tracking-tighter px-2 py-0">
              Type: {valueKind}
            </Badge>
          </div>
        </div>

        <div className="p-6 md:p-8">
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
                      <Bell className="size-3 text-cyan-300/60" />
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
      bank_name: (record?.bank_name as string) ?? '',
      account_number: (record?.account_number as string) ?? '',
      currency: (record?.currency as string) ?? '',
      is_active: record?.is_active ?? true,
      reason: '',
    },
  })

  // Watch fields for live preview
  const watchedName = form.watch('name')
  const watchedBank = form.watch('bank_name')
  const watchedAccount = form.watch('account_number')
  const watchedCurrency = form.watch('currency')

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
        bank_name: values.bank_name,
        account_number: values.account_number,
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
      <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden border-border/40 shadow-2xl">
        <div className="grid md:grid-cols-[1fr_260px]">
          {/* Form Side */}
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {record ? 'Refinar Configuración PSAV' : 'Nuevo Canal de Pago'}
              </DialogTitle>
              <DialogDescription className="text-sm">
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
                  <FormField control={form.control} name="bank_name" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Entidad Bancaria</FormLabel>
                      <FormControl><Input {...field} placeholder="Banco de ejemplo" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="account_number" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Número de Cuenta</FormLabel>
                      <FormControl><Input {...field} placeholder="000-000-000" className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-semibold text-foreground/80">Divisa</FormLabel>
                      <FormControl><Input {...field} placeholder="BOB, USD..." className="h-10 bg-muted/20 border-border/60 focus:bg-background transition-all" /></FormControl>
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
          <div className="bg-muted/40 border-l border-border/40 p-6 flex flex-col items-center space-y-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground w-full text-center">Previsualización</div>
            
            <div className="w-full aspect-square rounded-2xl bg-card shadow-xl shadow-black/10 border border-border/50 flex flex-col items-center justify-center p-6 space-y-4 relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/50 via-cyan-400/50 to-violet-400/50" />
              
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="QR Preview" 
                  className="w-full h-full object-contain transition-transform group-hover:scale-105" 
                />
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
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Cuenta ({watchedCurrency || 'CUR'})</div>
                <div className="text-xs font-mono font-medium text-foreground/70">{watchedAccount || '0000 0000 0000'}</div>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="w-full p-3 rounded-xl bg-amber-400/5 border border-amber-400/10 text-[11px] text-amber-200/80 italic leading-relaxed text-center">
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
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden border-destructive/20 shadow-2xl">
        <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-destructive">¿Eliminar este canal?</DialogTitle>
            <DialogDescription className="text-sm">
              Esta acción es irreversible. El canal <span className="font-semibold text-foreground">&quot;{record.name}&quot;</span> dejará de estar disponible para todos los usuarios.
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
