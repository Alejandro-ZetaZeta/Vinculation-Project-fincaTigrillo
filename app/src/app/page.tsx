import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/cookies'

async function AuthRedirect() {
  const token = await getAccessToken()
  if (token) redirect('/dashboard')
  redirect('/login')
  return null
}

export default function HomePage() {
  return (
    <Suspense>
      <AuthRedirect />
    </Suspense>
  )
}
