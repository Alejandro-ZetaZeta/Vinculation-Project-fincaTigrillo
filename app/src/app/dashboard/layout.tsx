import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <Header userName={user.fullName} userRole={user.role} userEmail={user.email} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
