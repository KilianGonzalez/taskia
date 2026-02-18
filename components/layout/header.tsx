"use client"
export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-6">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tu semana</h1>
          <span className="text-sm text-muted-foreground">(18-24 Feb)</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            🔔
          </button>
          <button className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            👤
          </button>
        </div>
      </div>
    </header>
  )
}
