export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido!</h1>
        <p className="text-muted-foreground mt-2">Tu semana con TaskIA</p>
      </div>
      <div className="p-12 rounded-2xl border bg-gradient-to-r from-blue-50 to-purple-50 shadow-xl h-80 flex flex-col items-center justify-center">
        <span className="text-6xl mb-6">🚀</span>
        <h2 className="text-2xl font-bold mb-4">¡FUNCIONA PERFECTO!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Sidebar ✓ | Header ✓ | Layout ✓ | ¡Listo para Login!
        </p>
      </div>
    </div>
  )
}
