export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-2xl">
          TaskIA
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Tu asistente IA que organiza tu semana de estudio de forma inteligente. 
          <strong>Empieza ahora</strong> y toma el control total de tus objetivos.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto text-center"
          >
            🚀 Empezar ahora
          </a>
          <a
            href="#"
            className="px-8 py-4 rounded-2xl border border-border font-medium text-lg hover:bg-accent transition-colors w-full sm:w-auto text-center"
          >
            Ver demo
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <div className="text-left p-6 rounded-xl border bg-card hover:shadow-xl transition-all">
            <span className="text-3xl mb-3">📅</span>
            <h3 className="font-bold text-xl mb-2">Planificación IA</h3>
            <p className="text-muted-foreground">Organiza automáticamente tus tareas por prioridad e importancia.</p>
          </div>
          <div className="text-left p-6 rounded-xl border bg-card hover:shadow-xl transition-all">
            <span className="text-3xl mb-3">⚡</span>
            <h3 className="font-bold text-xl mb-2">Sprint inteligente</h3>
            <p className="text-muted-foreground">Divide tus objetivos en sprints semanales accionables.</p>
          </div>
          <div className="text-left p-6 rounded-xl border bg-card hover:shadow-xl transition-all">
            <span className="text-3xl mb-3">🎯</span>
            <h3 className="font-bold text-xl mb-2">Progreso real</h3>
            <p className="text-muted-foreground">Visualiza tu evolución y ajusta sobre la marcha.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
