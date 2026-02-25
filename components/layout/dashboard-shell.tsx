'use client'

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useSidebar } from "@/components/layout/sidebar-context"

export function DashboardShell({ 
  children, 
  avatarUrl 
}: { 
  children: React.ReactNode
  avatarUrl: string | null 
}) {
  const { collapsed } = useSidebar()

  return (
    <div className="h-screen bg-background flex">
      <aside className={`hidden lg:flex border-r shrink-0 transition-all duration-300 ${
        collapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header avatarUrl={avatarUrl} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}