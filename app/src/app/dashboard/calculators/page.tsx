// Server component — obtiene el rol y lo pasa al cliente
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import CalculatorsClient from './CalculatorsClient'

export default async function CalculatorsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <CalculatorsClient isAdmin={user.role === 'admin'} />
}
