import { SembriosClient } from '@/components/sembrios/SembriosClient'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Sembrios | Finca Tigrillo' }

export default async function SembriosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <SembriosClient userRole={user.role} />
}
