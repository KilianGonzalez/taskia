'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarView } from "@/components/calendar/CalendarView";

// Definimos el tipo para las tareas
interface Task {
  id: string;
  title: string;
  priority: number;
  category?: string;
}

export default function DashboardPage() {
  // Datos de ejemplo para las tareas
  const tasks: Task[] = [
    { id: '1', title: 'Revisar documentación', priority: 1, category: 'Trabajo' },
    { id: '2', title: 'Hacer ejercicio', priority: 2, category: 'Salud' },
    { id: '3', title: 'Comprar víveres', priority: 3, category: 'Hogar' }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tu Calendario</h1>
        <p className="text-muted-foreground mt-2">Visualiza y gestiona tu planificación semanal</p>
      </div>
      
      <div className="flex-1 rounded-xl border bg-card p-4 shadow-sm">
        <CalendarView />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloques Hoy</CardTitle>
            <span className="text-2xl">📅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Programados para hoy</p>
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
            <span className="text-2xl">🔥</span>
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
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay tareas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.category && (
                        <p className="text-sm text-muted-foreground">{task.category}</p>
                      )}
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
            <Button asChild className="w-full mt-4">
              <Link href="/dashboard/tasks">Ver todas las tareas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
            <CardDescription>Tu progreso semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Tareas completadas</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: '75%' }} 
                  />
                </div>
                <p className="text-right text-sm text-muted-foreground mt-1">15/20 tareas</p>
              </div>
              <div>
                <p className="text-sm font-medium">Horas productivas</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: '60%' }} 
                  />
                </div>
                <p className="text-right text-sm text-muted-foreground mt-1">18/30 horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}