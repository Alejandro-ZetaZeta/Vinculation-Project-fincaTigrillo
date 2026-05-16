import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <EventsClient isAdmin={user.role === 'admin'} />
}
