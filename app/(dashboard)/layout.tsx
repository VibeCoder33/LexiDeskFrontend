import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/serverApi'
import { AppSidebar } from '@/components/app-sidebar'
import { QuickNotesFab } from '@/components/quick-notes-fab'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)]">
      {/* Fixed Left Sidebar */}
      <AppSidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
          {children}
        </main>
      </div>

      {/* Floating Action Button for Quick Notes */}
      <QuickNotesFab />
    </div>
  )
}
