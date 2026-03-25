'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  CalendarDays,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock3,
} from 'lucide-react'

const benefits = [
  {
    icon: Brain,
    title: 'Planificación con IA',
    description:
      'TaskIA organiza tu semana según exámenes, tareas y tu ritmo real, no con un horario rígido imposible de seguir.',
  },
  {
    icon: CalendarDays,
    title: 'Todo en una sola vista',
    description:
      'Clases, estudio, entrenos y tiempo personal en un mismo calendario para que sepas qué toca sin pensar demasiado.',
  },
  {
    icon: RefreshCw,
    title: 'Replanificación automática',
    description:
      'Si un día se rompe, la semana no se cae. TaskIA reajusta bloques y te propone una nueva versión realista.',
  },
]

const miniPoints = [
  'Divide tareas largas en sesiones.',
  'Prioriza entregas y exámenes cercanos.',
  'Evita sobrecargar días imposibles.',
  'Reduce el estrés de decidir qué hacer.',
]

export function Benefits() {
  return (
    <section id="features" className="relative overflow-hidden py-20 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/70 to-white" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4EC4A9]/25 bg-[#4EC4A9]/10 px-4 py-2 text-sm font-medium text-[#1D2155]">
            <Sparkles className="h-4 w-4 text-[#4EC4A9]" />
            Pensado para semanas reales
          </div>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#1D2155] sm:text-4xl">
            Menos caos, más claridad
          </h2>

          <p className="text-lg leading-relaxed text-slate-600">
            Una experiencia hecha para organizar estudio y vida diaria sin saturarte.
            Clara, rápida y lo bastante flexible para adaptarse a ti.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon

            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                className="group rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4EC4A9] to-[#20589A] shadow-lg shadow-[#4EC4A9]/20">
                  <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                </div>

                <h3 className="mb-3 text-xl font-semibold text-[#1D2155]">
                  {benefit.title}
                </h3>

                <p className="leading-relaxed text-slate-600">
                  {benefit.description}
                </p>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 grid gap-6 rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-7 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1D2155]">
                <Clock3 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1D2155]">
                Diseñado para no agobiar
              </h3>
            </div>

            <p className="max-w-2xl leading-relaxed text-slate-600">
              La idea no es llenarte la agenda, sino ayudarte a mantener una semana
              entendible, editable y sostenible incluso cuando aparecen imprevistos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {miniPoints.map((point, index) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4EC4A9]" />
                <span className="text-sm font-medium text-slate-700">{point}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}