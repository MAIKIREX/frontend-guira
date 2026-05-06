import { ClientDashboard } from '@/features/wallet/components/client-dashboard'
import { MyAccountsPage } from '@/features/client/components/my-accounts-page'

export const metadata = {
  title: 'Panel | Guira',
  description: 'Panel de control con cotizaciones, balance total, y gestión de wallets y cuentas virtuales.',
}

export default function PanelPage() {
  return (
    <ClientDashboard>
      <MyAccountsPage embedded />
    </ClientDashboard>
  )
}
