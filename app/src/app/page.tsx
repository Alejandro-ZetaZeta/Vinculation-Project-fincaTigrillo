import { redirect } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/cookies'

export default async function HomePage() {
  const token = await getAccessToken()
  if (token) redirect('/dashboard')
  redirect('/login')
}
