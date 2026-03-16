import { OnboardingDetailPage } from '@/features/staff/components/onboarding-detail-page'

export default async function AdminOnboardingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <OnboardingDetailPage onboardingId={id} />
}
