'use client'

import { motion } from 'framer-motion'
import {
  CalendarRange,
  Sparkles,
  BookOpen,
  Dumbbell,
  Coffee,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { LandingButton } from './ui/LandingButton'

const schedule = [
  {
    time: '16:00',
    title: 'Matemáticas',
    subtitle: 'Ejercicios · 45 min',
    color: 'from-[#4EC4A9] to-[#2ea58d]',
    icon: BookOpen,
  },
  {
    time: '17:00',
    title: 'Entreno',
    subtitle: 'Baloncesto · 1 h',
    color: 'from-[#20589A] to-[#1D2155]',
    icon: Dumbbell,
  },
  {
    time: '18:30',
    title: 'Descanso',
    subtitle: 'Pausa corta · 20 min',
    color: 'from-[#F59E0B] to-[#F97316]',
    icon: Coffee,
  },
]

const plans = [
  {
    name: 'Gratis',
    price: '0€',
    description: 'Para empezar a organizar tu semana.',
    features: ['Agenda visual', 'Bloques básicos', 'Primer flujo de organización'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '9€/mes',
    description: 'Para sacar partido a la planificación inteligente.',
    features: ['IA para replanificar', 'Prioridades y objetivos', 'Más personalización'],
    highlighted: true,
  },
]

export function ProductShowcase() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1D2155]/5 via-white to-[#4EC4A9]/5" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#20589A]/20 bg-white px-4 py-2 text-sm font-medium text-[#1D2155] shadow-sm">
            <CalendarRange className="h-4 w-4 text-[#20589A]" />
            Vista semanal clara
          </div>

          <h2 className="mb-5 text-3xl font-bold tracking-tight text-[#1D2155] sm:text-4xl">
            Visualiza tu semana sin perderte
          </h2>

          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-slate-600">
            Una interfaz limpia para ver qué toca, qué se puede mover y dónde encaja
            cada tarea. La IA te propone el plan, pero tú sigues teniendo control.
          </p>

          <div className="space-y-4">
            {[
              'Bloques de estudio más fáciles de seguir.',
              'Compromisos fijos y tareas flexibles en el mismo sitio.',
              'Ajustes rápidos cuando cambian tus días.',
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4EC4A9]" />
                <span className="text-slate-700">{item}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <LandingButton size="lg" className="bg-gradient-to-r from-[#1D2155] to-[#20589A] text-white">
              Ver cómo funciona
              <ArrowRight className="h-4 w-4" />
            </LandingButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
          className="space-y-6"
        >
          <div className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-2xl shadow-slate-200/50">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Semana actual</p>
                <h3 className="text-xl font-semibold text-[#1D2155]">Tu agenda</h3>
              </div>

              <div className="rounded-2xl bg-[#4EC4A9]/10 px-3 py-2 text-sm font-semibold text-[#1D2155]">
                IA activa
              </div>
            </div>

            <div className="space-y-4">
              {schedule.map((item, index) => {
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="grid grid-cols-[72px_1fr] items-center gap-4 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-500">
                      {item.time}
                    </div>

                    <div className={`rounded-2xl bg-gradient-to-r ${item.color} p-4 text-white`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{item.title}</span>
                      </div>
                      <p className="text-sm text-white/85">{item.subtitle}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="mt-5 rounded-2xl border border-[#4EC4A9]/20 bg-[#4EC4A9]/10 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1D2155]" />
                <p className="text-sm text-[#1D2155]">
                  “He movido el repaso de Historia al sábado para dejarte hoy más
                  ligero después del entreno.”
                </p>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-6 shadow-sm ${
                  plan.highlighted
                    ? 'border-[#20589A]/20 bg-[#1D2155] text-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-4">
                  <p
                    className={`text-sm font-medium ${
                      plan.highlighted ? 'text-white/70' : 'text-slate-500'
                    }`}
                  >
                    {plan.name}
                  </p>
                  <h3 className="mt-1 text-3xl font-bold">{plan.price}</h3>
                </div>

                <p
                  className={`mb-5 text-sm leading-relaxed ${
                    plan.highlighted ? 'text-white/80' : 'text-slate-600'
                  }`}
                >
                  {plan.description}
                </p>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          plan.highlighted ? 'text-[#4EC4A9]' : 'text-[#20589A]'
                        }`}
                      />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}