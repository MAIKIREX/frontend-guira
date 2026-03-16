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
import { ACCEPTED_UPLOADS, safeFileExtension } from '@/lib/file-validation'
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
            <div><span className="text-muted-foreground block text-xs">Archivado:</span> <span className={"font-semibold " + (user.is_archived ? "text-yellow-600" : "text-green-600")}>{user.is_archived ? 'Sí' : 'No'}</span></div>
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
      toast.success('Fee config actualizada.')
      setOpen(false)
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update fee config', error)
      toast.error('No se pudo actualizar la fee config.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Editar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar fee config</DialogTitle>
          <DialogDescription>Ajusta \`value\` y \`currency\` sin tocar la estructura del registro.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl><Input {...field} min={0} step="0.01" type="number" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica el cambio" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button></DialogFooter>
          </form>
        </Form>
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
      toast.success('App setting actualizado.')
      setOpen(false)
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update app setting', error)
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el app setting.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Editar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar app setting</DialogTitle>
          <DialogDescription>
            Preserva el tipo actual del valor. Tipo detectado: \`{valueKind}\`.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Textarea {...field} className="min-h-[120px] font-mono text-sm" />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {getAppSettingHelpText(valueKind)}
                </p>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica el cambio" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function PsavConfigDialogs({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => Promise<void> | void; record: PsavConfigRow }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <PsavUpsertDialog actor={actor} label="Editar" onUpdated={onUpdated} record={record} />
      <PsavDeleteDialog actor={actor} onUpdated={onUpdated} record={record} />
    </div>
  )
}

export function PsavCreateDialog({ actor, onUpdated }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => Promise<void> | void }) {
  return <PsavUpsertDialog actor={actor} label="Nuevo PSAV" onUpdated={onUpdated} />
}

function PsavUpsertDialog({ actor, label, onUpdated, record }: { actor: StaffActor; label: string; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => Promise<void> | void; record?: PsavConfigRow }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
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
      toast.success(record ? 'PSAV actualizado.' : 'PSAV creado.')
      setOpen(false)
      setFile(null)
      await onUpdated(updatedRecord, 'replace')
    } catch (error) {
      console.error('Failed to upsert psav config', error)
      toast.error('No se pudo guardar el PSAV config. Verifica los datos o la imagen.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{label}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar PSAV config' : 'Crear PSAV config'}</DialogTitle>
          <DialogDescription>Completa el formulario; la información se guardará en `psav_configs`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Canal</FormLabel>
                <FormControl><Input {...field} placeholder="Punto de Pago, Cajero..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <FormControl><Input {...field} placeholder="Banco Local" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="account_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Cuenta</FormLabel>
                <FormControl><Input {...field} placeholder="1234567890" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <FormControl><Input {...field} placeholder="BOB, USD..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activo</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <div className="space-y-2 text-sm font-medium">
              <FormLabel>Código QR (Imagen)</FormLabel>
              {record?.qr_url && <img src={record.qr_url as string} alt="QR actual" className="w-24 h-24 object-contain rounded-md block mb-2 border border-border" />}
              <Input accept={ACCEPTED_UPLOADS} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica el cambio" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Guardar PSAV'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function PsavDeleteDialog({ actor, onUpdated, record }: { actor: StaffActor; onUpdated: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => Promise<void> | void; record: PsavConfigRow }) {
  const [open, setOpen] = useState(false)
  const form = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: AdminReasonValues) {
    try {
      await AdminService.deletePsavConfig({ actor, record, reason: values.reason })
      toast.success('PSAV eliminado.')
      setOpen(false)
      form.reset()
      await onUpdated(record, 'remove')
    } catch (error) {
      console.error('Failed to delete psav config', error)
      toast.error('No se pudo eliminar el PSAV config.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>Eliminar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar PSAV config</DialogTitle>
          <DialogDescription>Se elimina el registro y se deja trazabilidad en auditoria.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Justifica la eliminacion" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit" variant="destructive">{form.formState.isSubmitting ? 'Guardando...' : 'Eliminar PSAV'}</Button></DialogFooter>
          </form>
        </Form>
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
