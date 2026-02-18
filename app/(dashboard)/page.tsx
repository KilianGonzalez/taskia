import { getFlexibleTasks, getScheduledBlocks } from '@/app/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const flexibleTasks = await getFlexibleTasks()
  const scheduledBlocks = await getScheduledBlocks(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido a TaskIA!</h1>
        <p className="text-muted-foreground mt-2">Tu semana organizada inteligentemente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Activas</CardTitle>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flexibleTasks.length}</div>
            <p className="text-xs text-muted-foreground">Tareas pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloques Hoy</CardTitle>
            <span className="text-2xl">📅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduledBlocks.filter(block => {
                const blockDate = new Date(block.start_datetime).toDateString()
                const today = new Date().toDateString()
                return blockDate === today
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Programadas para hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Semana</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">Completado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Racha Actual</CardTitle>
            <span className="text-2xl">�</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Días seguidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Tareas</CardTitle>
            <CardDescription>Tus tareas más urgentes</CardDescription>
          </CardHeader>
          <CardContent>
            {flexibleTasks.length === 0 ? (
              <p className="text-muted-foreground">No hay tareas pendientes</p>
            ) : (
              <div className="space-y-3">
                {flexibleTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.category}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.priority === 1 ? 'bg-red-100 text-red-800' :
                      task.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority === 1 ? 'Alta' : task.priority === 2 ? 'Media' : 'Baja'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/dashboard/tasks">Ver todas las tareas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendario Rápido</CardTitle>
            <CardDescription>Vista previa de tu semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📅</span>
                <p className="text-muted-foreground">Calendario FullCalendar</p>
                <p className="text-sm text-muted-foreground">Próximamente</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" disabled>
                Ver calendario completo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/test">🧪 Probar conexión</Link>
        </Button>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/(auth)/login">🔐 Ir al login</Link>
        </Button>
      </div>
    </div>
  )
}
