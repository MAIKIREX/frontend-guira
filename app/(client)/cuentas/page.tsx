import { MyAccountsPage } from '@/features/client/components/my-accounts-page'

export const metadata = {
  title: 'Mis Cuentas | Guira',
  description: 'Visualiza tus wallets y balances asociados a tu cuenta Guira.',
}

export default function CuentasPage() {
  return <MyAccountsPage />
}
