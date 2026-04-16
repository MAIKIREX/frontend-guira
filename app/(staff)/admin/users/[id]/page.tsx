import { UserDetailPage } from '@/features/staff/components/user-detail-page'

export default async function AdminUserDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <UserDetailPage userId={id} />
}
