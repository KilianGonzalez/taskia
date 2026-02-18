"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "📅 Semana", icon: "📅" },
  { href: "/dashboard/tasks", label: "📝 Tareas", icon: "📝" },
  { href: "/dashboard/goals", label: "⚡ Objetivos", icon: "⚡" },
  { href: "/dashboard/settings", label: "⚙️ Ajustes", icon: "⚙️" },
]

export function Sidebar() {
  const pathname = usePathname()
  
  return (
    <div className="w-full h-full flex flex-col p-4 bg-card border-r">
      <div className="mb-8 pb-6 border-b">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          TaskIA
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Semana 9</p>
      </div>
      
      <nav className="flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "hover:bg-accent"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
