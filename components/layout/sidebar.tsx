"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/layout/sidebar-context"
import { 
  LayoutDashboard, 
  ListTodo, 
  Zap, 
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

const navItems = [
  { href: "/dashboard",          label: "Semana",    icon: LayoutDashboard },
  { href: "/dashboard/tasks",    label: "Tareas",    icon: ListTodo },
  { href: "/dashboard/goals",    label: "Objetivos", icon: Zap },
  { href: "/dashboard/settings", label: "Ajustes",   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <div className={`relative h-full flex flex-col bg-white border-r transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>

      {/* Logo */}
      <div className={`flex items-center border-b h-16 px-4 ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskIA
            </h2>
            <p className="text-[10px] text-muted-foreground">Semana 9</p>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            T
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined} // Tooltip cuando está colapsado
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? "bg-[hsl(236,49%,22%)] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Botón de colapsar */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md text-slate-500 hover:text-slate-900 transition-all"
      >
        {collapsed 
          ? <ChevronRight className="w-3 h-3" /> 
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </div>
  )
}