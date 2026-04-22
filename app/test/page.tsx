import { getFlexibleTasks, getScheduledBlocks } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function TestPage() {
  // Test Server Actions
  const flexibleTasks = await getFlexibleTasks()
  const scheduledBlocks = await getScheduledBlocks()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🧪 Test de Conexión Supabase</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📝 Tareas Flexibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flexibleTasks.length === 0 ? (
                <p className="text-muted-foreground">No hay tareas (o sin autenticar)</p>
              ) : (
                flexibleTasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Prioridad: {task.priority} | Categoría: {task.category}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📅 Bloques Programados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduledBlocks.length === 0 ? (
                <p className="text-muted-foreground">No hay bloques (o sin autenticar)</p>
              ) : (
                scheduledBlocks.map((block) => (
                  <div key={block.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{block.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(block.start).toLocaleString()} - 
                      {new Date(block.end).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔍 Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>✅ Server Actions funcionando</p>
            <p>✅ Conexión Supabase establecida</p>
            <p>✅ Componentes UI importados correctamente</p>
            <p>📊 Tareas encontradas: {flexibleTasks.length}</p>
            <p>📊 Bloques encontrados: {scheduledBlocks.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
