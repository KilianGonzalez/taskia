import Link from 'next/link'
import { CalendarDays, Sparkles, Target } from 'lucide-react'

const features = [
  {
    title: 'Planificación IA',
    description:
      'Organiza automáticamente tus tareas por prioridad e importancia.',
    icon: Sparkles,
  },
  {
    title: 'Sprint inteligente',
    description: 'Divide tus objetivos en sprints semanales accionables.',
    icon: CalendarDays,
  },
  {
    title: 'Progreso real',
    description: 'Visualiza tu evolución y ajusta sobre la marcha.',
    icon: Target,
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-md">
            <span className="text-lg font-black text-white">T</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">TaskIA</span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              Tu asistente IA para estudiar mejor
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              Organiza tu semana de forma inteligente
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              TaskIA te ayuda a planificar estudio, tareas y vida diaria en un
              solo lugar, con una semana clara, flexible y adaptada a tus
              objetivos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Empezar ahora
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="text-lg font-bold">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}