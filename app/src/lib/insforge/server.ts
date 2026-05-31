import { createClient } from '@insforge/sdk'

export function createInsForgeServerClient(accessToken?: string) {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.INSFORGE_ANON_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    isServerMode: true,
    edgeFunctionToken: accessToken
  })
}

// Service-role client: bypasses RLS. Use only in server-side cron/admin routes.
export function createInsForgeAdminClient() {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.INSFORGE_API_KEY!,
    isServerMode: true,
  })
}
