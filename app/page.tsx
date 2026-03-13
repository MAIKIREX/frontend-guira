import { redirect } from 'next/navigation'

export default function HomePage() {
  // Por ahora redirigimos al login
  redirect('/login')
}
