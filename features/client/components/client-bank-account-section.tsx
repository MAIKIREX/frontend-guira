'use client'

import { useEffect, useState } from 'react'
import { Landmark, AlertTriangle, CheckCircle2, Clock, Loader2, Pencil, Plus } from 'lucide-react'
import { GuiraButton } from '@/components/shared/guira-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useProfileStore } from '@/stores/profile-store'
import {
  ClientBankAccountsService,
  type ClientBankAccount,
  type CreateBankAccountInput,
  type UpdateBankAccountInput,
} from '@/services/client-bank-accounts.service'

export function ClientBankAccountSection() {
  const { profile } = useProfileStore()
  const [account, setAccount] = useState<ClientBankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const isApproved = profile?.onboarding_status === 'approved'

  useEffect(() => {
    if (!isApproved) {
      setLoading(false)
      return
    }
    loadAccount()
  }, [isApproved])

  const loadAccount = async () => {
    try {
      setLoading(true)
      const data = await ClientBankAccountsService.getPrimary()
      setAccount(data)
    } catch (err) {
      console.error('Error loading bank account:', err)
    } finally {
      setLoading(false)
    }
  }

  // No mostrar si el usuario no está aprobado
  if (!isApproved) return null

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Landmark className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Cuenta bancaria para retiros (Bolivia)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Registra los datos de tu cuenta bancaria personal en Bolivia. Se usarán
          exclusivamente para procesar retiros desde tu wallet hacia tu cuenta en
          bolivianos (BOB).
        </p>
      </div>
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : account ? (
          <BankAccountDisplay
            account={account}
            profileFullName={profile?.full_name}
            onEdit={() => setShowEditDialog(true)}
          />
        ) : (
          <EmptyBankAccountCTA onRegister={() => setShowCreateDialog(true)} />
        )}
      </div>

      {/* Dialog: Registrar cuenta */}
      <BankAccountFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
        profileFullName={profile?.full_name}
        onSubmit={async (data) => {
          const created = await ClientBankAccountsService.create(data as CreateBankAccountInput)
          setAccount(created)
          setShowCreateDialog(false)
          toast.success('Cuenta bancaria registrada exitosamente.')
        }}
      />

      {/* Dialog: Solicitar cambio */}
      {account && (
        <BankAccountFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          mode="edit"
          profileFullName={profile?.full_name}
          initialValues={{
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder: account.account_holder,
            account_type: account.account_type as 'savings' | 'checking',
          }}
          onSubmit={async (data) => {
            const updated = await ClientBankAccountsService.requestUpdate(
              account.id,
              data as UpdateBankAccountInput,
            )
            setAccount(updated)
            setShowEditDialog(false)
            toast.success(
              'Solicitud de cambio enviada. Un miembro del equipo la revisará a la brevedad.',
            )
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────

/**
 * Calcula si el usuario ya usó su cambio mensual.
 * Retorna la fecha del próximo mes si está bloqueado, o null si puede cambiar.
 */
function getMonthlyLockDate(lastChangeAt: string | null): string | null {
  if (!lastChangeAt) return null
  const last = new Date(lastChangeAt)
  const now = new Date()
  if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return null
}

function BankAccountDisplay({
  account,
  profileFullName,
  onEdit,
}: {
  account: ClientBankAccount
  profileFullName?: string | null
  onEdit: () => void
}) {
  const isPending = account.status === 'pending_approval'
  const holderMismatch =
    profileFullName &&
    account.account_holder.toLowerCase().trim() !==
      profileFullName.toLowerCase().trim()
  const monthlyLock = getMonthlyLockDate(account.last_change_requested_at)
  const isEditBlocked = isPending || !!monthlyLock

  return (
    <div className="space-y-4">
      {/* Status badge — cambio pendiente */}
      {isPending && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Cambio pendiente de aprobación</p>
            <p className="mt-0.5 opacity-80">
              Tu solicitud de cambio está siendo revisada por el equipo. Los
              datos actuales siguen vigentes hasta la aprobación.
            </p>
          </div>
        </div>
      )}

      {/* Rate limit notice */}
      {!isPending && monthlyLock && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-blue-700 dark:text-blue-400">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Límite de cambio mensual alcanzado</p>
            <p className="mt-0.5 opacity-80">
              Ya solicitaste un cambio este mes. Podrás solicitar otro a partir
              del <strong>{monthlyLock}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Account data */}
      <div className="space-y-0">
        <InfoField label="Banco" value={account.bank_name} />
        <InfoField
          label="Número de cuenta"
          value={account.account_number}
          mono
        />
        <InfoField label="Titular" value={account.account_holder} />
        <InfoField
          label="Tipo de cuenta"
          value={
            account.account_type === 'savings'
              ? 'Caja de ahorro'
              : 'Cuenta corriente'
          }
        />
        <InfoField label="Moneda" value={account.currency} />
        <InfoField
          label="Estado"
          value={isPending ? 'Cambio pendiente' : 'Activa'}
          statusColor={isPending ? 'text-amber-600' : 'text-emerald-600'}
          icon={isPending ? Clock : CheckCircle2}
          isLast
        />
      </div>

      {/* Soft validation warning */}
      {holderMismatch && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-50/50 p-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>
            El titular de la cuenta ({account.account_holder}) no coincide
            exactamente con tu nombre registrado ({profileFullName}). Verifica
            que los datos sean correctos para evitar retrasos en tus retiros.
          </p>
        </div>
      )}

      {/* Security notice */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        🔒 Por seguridad, los retiros solo pueden realizarse hacia esta cuenta
        bancaria registrada a tu nombre. Cualquier cambio requiere aprobación
        del equipo operativo.
      </div>

      {/* Actions — solo editar, sin eliminar */}
      <div className="flex gap-3">
        <GuiraButton
          variant="primary"
          onClick={onEdit}
          disabled={isEditBlocked}
          iconStart={Pencil}
        >
          {isPending
            ? 'Cambio en revisión...'
            : monthlyLock
              ? `Próximo cambio: ${monthlyLock}`
              : 'Solicitar cambio'}
        </GuiraButton>
      </div>
    </div>
  )
}

function EmptyBankAccountCTA({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-blue-700 dark:text-blue-400">
        <Landmark className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            Registra tu cuenta bancaria personal
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs opacity-85 leading-relaxed">
            <li>
              Agiliza tus retiros sin tener que ingresar los datos en cada
              operación.
            </li>
            <li>
              Por seguridad, los retiros <strong>solo</strong> pueden realizarse
              hacia tu propia cuenta bancaria.
            </li>
            <li>
              El titular debe coincidir con tu identidad verificada en la
              plataforma.
            </li>
          </ul>
        </div>
      </div>

      <GuiraButton onClick={onRegister} iconStart={Plus}>
        Registrar cuenta bancaria
      </GuiraButton>
    </div>
  )
}

function InfoField({
  label,
  value,
  mono,
  statusColor,
  icon: Icon,
  isLast,
}: {
  label: string
  value: string
  mono?: boolean
  statusColor?: string
  icon?: typeof CheckCircle2
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        !isLast && 'border-b border-border/40',
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:min-w-44">
        {label}
      </div>
      <div
        className={cn(
          'text-sm font-medium text-foreground sm:text-right',
          mono && 'font-mono tracking-wide',
          statusColor,
        )}
      >
        {Icon && <Icon className="mr-1.5 inline-block size-3.5" />}
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
//  Form Dialog (Create / Edit)
// ─────────────────────────────────────────────────────

function BankAccountFormDialog({
  open,
  onOpenChange,
  mode,
  profileFullName,
  initialValues,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  profileFullName?: string | null
  initialValues?: CreateBankAccountInput
  onSubmit: (data: CreateBankAccountInput | UpdateBankAccountInput) => Promise<void>
}) {
  const [bankName, setBankName] = useState(initialValues?.bank_name ?? '')
  const [accountNumber, setAccountNumber] = useState(
    initialValues?.account_number ?? '',
  )
  const [accountHolder, setAccountHolder] = useState(
    initialValues?.account_holder ?? profileFullName ?? '',
  )
  const [accountType, setAccountType] = useState<'savings' | 'checking'>(
    initialValues?.account_type ?? 'savings',
  )
  const [changeReason, setChangeReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBankName(initialValues?.bank_name ?? '')
      setAccountNumber(initialValues?.account_number ?? '')
      setAccountHolder(
        initialValues?.account_holder ?? profileFullName ?? '',
      )
      setAccountType(initialValues?.account_type ?? 'savings')
      setChangeReason('')
      setError(null)
    }
  }, [open, initialValues, profileFullName])

  const baseValid =
    bankName.trim().length >= 2 &&
    accountNumber.trim().length >= 4 &&
    accountHolder.trim().length >= 3

  const isValid = mode === 'create'
    ? baseValid
    : baseValid && changeReason.trim().length >= 10

  const holderMismatch =
    profileFullName &&
    accountHolder.trim().toLowerCase() !== profileFullName.trim().toLowerCase()

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload: { bank_name: string; account_number: string; account_holder: string; account_type: string; change_reason?: string } = {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        account_type: accountType,
      }
      if (mode === 'edit') {
        payload.change_reason = changeReason.trim()
      }
      await onSubmit(payload)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error inesperado.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Registrar cuenta bancaria'
              : 'Solicitar cambio de cuenta bancaria'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Ingresa los datos de tu cuenta bancaria personal en Bolivia. Esta información se usará exclusivamente para retiros.'
              : 'Los cambios requieren aprobación del equipo operativo. Se te notificará cuando sean procesados. Límite: 1 cambio por mes.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Banco</Label>
            <Input
              id="bank_name"
              placeholder="Ej: Banco Mercantil Santa Cruz"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_number">Número de cuenta</Label>
              <Input
                id="account_number"
                placeholder="Ej: 4010-123456-001"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">Tipo de cuenta</Label>
              <Select
                value={accountType}
                onValueChange={(v) =>
                  setAccountType(v as 'savings' | 'checking')
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="account_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Caja de ahorro</SelectItem>
                  <SelectItem value="checking">Cuenta corriente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_holder">Titular de la cuenta</Label>
            <Input
              id="account_holder"
              placeholder="Nombre completo del titular"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              disabled={isSubmitting}
            />
            {holderMismatch && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="size-3" />
                El titular no coincide con tu nombre ({profileFullName}). Verifica que sea correcto.
              </p>
            )}
          </div>

          {/* Motivo del cambio — SOLO en modo edición */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="change_reason">
                Motivo del cambio <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="change_reason"
                placeholder="Explica por qué solicitas este cambio (mín. 10 caracteres)..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="resize-none"
              />
              {changeReason.length > 0 && changeReason.trim().length < 10 && (
                <p className="text-xs text-destructive">
                  El motivo debe tener al menos 10 caracteres ({changeReason.trim().length}/10).
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <GuiraButton
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </GuiraButton>
          <GuiraButton
            variant="primary"
            arrowNext
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === 'create'
              ? 'Registrar cuenta'
              : 'Enviar solicitud de cambio'}
          </GuiraButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
