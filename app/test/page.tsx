import { getFlexibleTasks, createFlexibleTask, getScheduledBlocks } from '@/app/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default async function TestPage() {
  // Test Server Actions
  const flexibleTasks = await getFlexibleTasks()
  const scheduledBlocks = await getScheduledBlocks(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días atrás
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()  // 7 días adelante
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🧪 TaskIA - Test de Conexión</h1>
        <p className="text-muted-foreground">
          Verificación de conexión con Supabase y Server Actions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Flexible Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Tareas Flexibles
              <span className={`px-2 py-1 rounded text-xs ${
                flexibleTasks.length >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {flexibleTasks.length >= 0 ? '✅ Conectado' : '❌ Error'}
              </span>
            </CardTitle>
            <CardDescription>
              Server Actions: getFlexibleTasks()
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Resultados:</p>
              {flexibleTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay tareas (o usuario no autenticado)</p>
              ) : (
                <div className="space-y-1">
                  {flexibleTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="text-xs p-2 bg-muted rounded">
                      <strong>{task.title}</strong> - Prioridad: {task.priority}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Total: {flexibleTasks.length} tareas encontradas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Scheduled Blocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📅 Bloques Programados
              <span className={`px-2 py-1 rounded text-xs ${
                scheduledBlocks.length >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {scheduledBlocks.length >= 0 ? '✅ Conectado' : '❌ Error'}
              </span>
            </CardTitle>
            <CardDescription>
              Server Actions: getScheduledBlocks()
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Resultados:</p>
              {scheduledBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay bloques programados (o usuario no autenticado)</p>
              ) : (
                <div className="space-y-1">
                  {scheduledBlocks.slice(0, 3).map((block) => (
                    <div key={block.id} className="text-xs p-2 bg-muted rounded">
                      <strong>{block.title}</strong><br />
                      {new Date(block.start_datetime).toLocaleString()}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Total: {scheduledBlocks.length} bloques encontrados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Form */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test de Creación de Tarea</CardTitle>
          <CardDescription>
            Server Action: createFlexibleTask()
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData: FormData) => {
            "use server"
            await createFlexibleTask(formData)
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                name="title"
                placeholder="Título de tarea"
                className="px-3 py-2 border rounded-md"
                required
              />
              <select
                name="priority"
                className="px-3 py-2 border rounded-md"
              >
                <option value="1">Alta</option>
                <option value="2">Media</option>
                <option value="3">Baja</option>
              </select>
              <select
                name="category"
                className="px-3 py-2 border rounded-md"
              >
                <option value="general">General</option>
                <option value="estudio">Estudio</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              Crear Tarea de Prueba
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">🔗 Enlaces Rápidos</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">Dashboard</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/login">Login</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Inicio</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
