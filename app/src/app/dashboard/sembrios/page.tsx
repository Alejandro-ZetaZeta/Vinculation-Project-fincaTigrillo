import { SembriosClient } from '@/components/sembrios/SembriosClient'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'

export default async function SembriosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <SembriosClient userRole={user.role} />
}
