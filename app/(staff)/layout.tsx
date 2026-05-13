import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffShell } from '@/components/layout/staff-shell'

export const dynamic = 'force-dynamic'

/**
 * Roles permitidos para acceder al panel de staff/admin.
 * Si el usuario no tiene uno de estos roles, se redirige al panel de cliente.
 */
const ALLOWED_STAFF_ROLES = ['staff', 'admin', 'super_admin']

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sin sesión → login
  if (!user) {
    redirect('/login')
  }

  // Verificar rol en la tabla profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_STAFF_ROLES.includes(profile.role)) {
    // Usuario autenticado pero sin permisos de staff → panel de cliente
    redirect('/panel')
  }

  return <StaffShell>{children}</StaffShell>
}
