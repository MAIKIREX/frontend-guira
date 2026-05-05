'use client'

/**
 * user-detail-page.tsx
 *
 * Página de detalle de usuario para el panel de administración.
 * Muestra información completa del usuario y organiza las acciones
 * administrativas en 4 tabs: Perfil, Financiero, Bancario, Administración.
 *
 * Reemplaza la columna "Acciones" de la tabla de usuarios.
 */
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Archive,
  CircleDollarSign,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  Percent,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  UserCog,
  Undo2,
  CalendarDays,
  Fingerprint,
  Globe,
  Wallet,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserDetail } from '@/features/staff/hooks/use-user-detail'
import {
  FeeOverridesPanel,
  VaFeeOverridePanel,
  BankAccountReviewPanel,
  ChangeRoleDialog,
  ResetPasswordDialog,
  ArchiveDeleteUserDialog,
  UnarchiveUserDialog,
} from '@/features/staff/components/admin-action-dialogs'
import { LiquidationAddressesPanel } from '@/features/staff/components/liquidation-addresses-panel'
import type { Profile } from '@/types/profile'

// ── Utilities ────────────────────────────────────────────
function getInitials(value?: string | null) {
  if (!value) return '??'
  return value
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function readProfileAvatarUrl(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined
  const raw = metadata.avatar_url ?? metadata.avatarUrl
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  client: { label: 'Cliente', variant: 'secondary' },
  staff: { label: 'Staff', variant: 'default' },
  admin: { label: 'Admin', variant: 'default' },
  super_admin: { label: 'Super Admin', variant: 'destructive' },
}

const ONBOARDING_CONFIG: Record<string, { label: string; classes: string }> = {
  approved: { label: 'Aprobado', classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  pending: { label: 'Pendiente', classes: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  in_review: { label: 'En revisión', classes: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  rejected: { label: 'Rechazado', classes: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400' },
  not_started: { label: 'Sin iniciar', classes: 'bg-muted text-muted-foreground border-border' },
}

// ── Main Component ───────────────────────────────────────
export function UserDetailPage({ userId }: { userId: string }) {
  const router = useRouter()
  const { user, actor, isAdmin, loading, error, refetch, setUser } = useUserDetail(userId)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando usuario...</p>
        </div>
      </div>
    )
  }

  if (error || !user || !actor) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Error al cargar usuario</CardTitle>
            <CardDescription>{error || 'No se encontró el usuario o no tienes permisos.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Usuarios
            </Button>
            <Button onClick={refetch}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Callback unificado para los dialogs de acciones simples
  const handleUserUpdated = async (updatedUser: Profile | null, mode: 'replace' | 'remove' | 'noop') => {
    if (mode === 'remove') {
      // El usuario fue eliminado — volver a la lista
      router.push('/admin/users')
      return
    }
    if (mode === 'replace' && updatedUser) {
      setUser(updatedUser)
    }
    // Para 'noop' (ej. reset password), solo recargamos
    await refetch()
  }

  const avatarUrl = user.avatar_url || readProfileAvatarUrl(user.metadata)
  const roleConfig = ROLE_CONFIG[user.role] ?? { label: user.role, variant: 'outline' as const }
  const onbConfig = ONBOARDING_CONFIG[user.onboarding_status] ?? ONBOARDING_CONFIG.not_started

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb ── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => router.push('/admin/users')}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Usuarios
      </Button>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <Avatar className="h-16 w-16 border-2 border-border shadow-md">
          <AvatarImage src={avatarUrl} alt={user.full_name} />
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{user.full_name || 'Sin nombre'}</h1>
            <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
            {user.is_archived && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400 gap-1">
                <Archive className="h-3 w-3" />
                Archivado
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Alta: {format(new Date(user.created_at), 'dd/MM/yyyy')}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <Fingerprint className="h-3.5 w-3.5" />
              {user.id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className={onbConfig.classes}>
              {onbConfig.label}
            </Badge>
            {user.bridge_customer_id && (
              <Badge variant="outline" className="gap-1 text-[10px] font-mono bg-blue-500/5 text-blue-600 border-blue-500/20 dark:text-blue-400">
                <Globe className="h-3 w-3" />
                Bridge: {user.bridge_customer_id.slice(0, 12)}...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto gap-0">
          <TabsTrigger
            value="perfil"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="financiero"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            <CircleDollarSign className="h-4 w-4 mr-2" />
            Financiero
          </TabsTrigger>
          <TabsTrigger
            value="bancario"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            <Landmark className="h-4 w-4 mr-2" />
            Bancario
          </TabsTrigger>
          <TabsTrigger
            value="liquidacion"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Liquidación
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            <Shield className="h-4 w-4 mr-2" />
            Administración
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Perfil ── */}
        <TabsContent value="perfil" className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Nombre completo" value={user.full_name || '—'} />
                <InfoRow label="Email" value={user.email} mono />
                <InfoRow label="ID" value={user.id} mono />
                <InfoRow label="Rol" value={roleConfig.label} />
                <InfoRow label="Fecha de alta" value={format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Estado de la Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Onboarding" value={onbConfig.label} />
                <InfoRow label="Archivado" value={user.is_archived ? 'Sí' : 'No'} />
                <InfoRow label="Bridge Customer ID" value={user.bridge_customer_id || 'No configurado'} mono={!!user.bridge_customer_id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Financiero ── */}
        <TabsContent value="financiero" className="mt-6 space-y-8">
          {/* Fee Overrides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-amber-500" />
                Tarifas Personalizadas
              </CardTitle>
              <CardDescription>
                Overrides de fee para este usuario. Tienen prioridad sobre la configuración global.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeeOverridesPanel actor={actor} user={user} />
            </CardContent>
          </Card>

          {/* VA Fee Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-500" />
                Developer Fee — Virtual Accounts
              </CardTitle>
              <CardDescription>
                Gestión del <code className="text-xs bg-muted px-1 py-0.5 rounded">developer_fee_percent</code> de Bridge.
                2 niveles: Override por usuario → Fee global por defecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VaFeeOverridePanel actor={actor} user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Bancario ── */}
        <TabsContent value="bancario" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Cuentas Bancarias
              </CardTitle>
              <CardDescription>
                Gestiona las cuentas bancarias de este usuario. Revisa y aprueba o rechaza solicitudes de cambio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankAccountReviewPanel actor={actor} user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Liquidación ── */}
        <TabsContent value="liquidacion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Liquidation Addresses
              </CardTitle>
              <CardDescription>
                Direcciones crypto de liquidación registradas por el usuario. Cada dirección recibe depósitos y los convierte automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LiquidationAddressesPanel actor={actor} user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Administración ── */}
        <TabsContent value="admin" className="mt-6 space-y-6">
          {/* Identidad y Acceso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Identidad y Acceso
              </CardTitle>
              <CardDescription>
                Modifica el rol o solicita un reseteo de contraseña para este usuario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <ChangeRoleDialog actor={actor} onUpdated={handleUserUpdated} user={user} />
                <ResetPasswordDialog actor={actor} email={user.email} onUpdated={handleUserUpdated} />
              </div>
            </CardContent>
          </Card>

          {/* Zona de Riesgo */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Zona de Riesgo
              </CardTitle>
              <CardDescription>
                Estas acciones tienen impacto significativo en la cuenta del usuario. Procede con precaución.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {user.is_archived ? (
                  <UnarchiveUserDialog actor={actor} onUpdated={handleUserUpdated} user={user} />
                ) : (
                  <ArchiveDeleteUserDialog action="archive" actor={actor} onUpdated={handleUserUpdated} user={user} />
                )}
                {!user.is_archived && (
                  <ArchiveDeleteUserDialog action="delete" actor={actor} onUpdated={handleUserUpdated} user={user} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</span>
    </div>
  )
}
