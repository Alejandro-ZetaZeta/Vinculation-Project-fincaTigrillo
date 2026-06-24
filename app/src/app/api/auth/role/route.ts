import { NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ role: 'viewer' })
    }

    const insforge = createInsForgeServerClient(accessToken)
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) {
      return NextResponse.json({ role: 'viewer' })
    }

    const { data: profile } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    return NextResponse.json({ role: profile?.role || 'viewer' })
  } catch {
    return NextResponse.json({ role: 'viewer' })
  }
}
