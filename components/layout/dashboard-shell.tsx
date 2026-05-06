'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useSidebar } from '@/components/layout/sidebar-context'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardShell({
  children,
  avatarUrl,
  userName,
}: {
  children: React.ReactNode
  avatarUrl: string | null
  userName: string
}) {
  const { collapsed } = useSidebar()

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside
        className={`hidden shrink-0 self-start lg:sticky lg:top-0 lg:flex lg:h-screen transition-all duration-300 ${
          collapsed ? 'lg:w-[4.4rem]' : 'lg:w-64'
        }`}
      >
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header avatarUrl={avatarUrl} userName={userName} />
        <main className="flex-1 page-shell">
          <PageTransition className="app-page">{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
