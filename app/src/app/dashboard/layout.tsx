import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

/*
  DashboardShell reads cookies via getCurrentUser — this makes it dynamic.
  Wrapping it in Suspense lets PPR render a static outer shell instantly
  while streaming the auth-gated layout in dynamically.
*/
async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex bg-background">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 md:ml-64">
        <Header userName={user.fullName} userRole={user.role} userEmail={user.email} />
        <main
          id="main-content"
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex bg-background animate-pulse">
      {/* Sidebar placeholder */}
      <div className="hidden md:block w-64 bg-surface border-r border-border shrink-0" />
      {/* Content placeholder */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-surface border-b border-border" />
        <div className="flex-1 p-8">
          <div className="h-8 w-64 bg-surface rounded-xl mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-surface rounded-2xl border border-border" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
