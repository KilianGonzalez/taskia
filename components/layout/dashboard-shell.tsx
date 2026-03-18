'use client'

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useSidebar } from "@/components/layout/sidebar-context"

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
    <div className="h-screen bg-[#f8fafc] dark:bg-gray-950 flex">
      <aside className={`hidden lg:flex border-r border-gray-200 dark:border-gray-800 shrink-0 transition-all duration-300 ${
        collapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-gray-950">
        <Header avatarUrl={avatarUrl} userName={userName} />
        <main className="flex-1 overflow-auto h-full">
          {children}
        </main>
      </div>
    </div>
  )
}