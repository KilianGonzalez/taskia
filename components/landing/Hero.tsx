'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Play,
  Calendar,
  CheckCircle2,
  Brain,
  Zap,
  Star,
  Clock,
} from 'lucide-react'
import { LandingButton } from './ui/LandingButton'

const floatingParticles = [
  { left: '8%', top: '12%', delay: 0.2, duration: 4.4 },
  { left: '16%', top: '28%', delay: 0.8, duration: 5.2 },
  { left: '24%', top: '52%', delay: 1.4, duration: 4.8 },
  { left: '32%', top: '18%', delay: 1.1, duration: 5.5 },
  { left: '40%', top: '70%', delay: 0.5, duration: 4.1 },
  { left: '48%', top: '30%', delay: 1.8, duration: 5.8 },
  { left: '56%', top: '10%', delay: 0.9, duration: 4.7 },
  { left: '64%', top: '62%', delay: 2.2, duration: 5.1 },
  { left: '72%', top: '24%', delay: 1.6, duration: 4.6 },
  { left: '80%', top: '48%', delay: 2.5, duration: 5.4 },
  { left: '88%', top: '16%', delay: 0.7, duration: 4.3 },
  { left: '14%', top: '82%', delay: 1.9, duration: 5.7 },
  { left: '36%', top: '84%', delay: 2.1, duration: 4.9 },
  { left: '62%', top: '80%', delay: 1.3, duration: 5.3 },
  { left: '90%', top: '74%', delay: 2.8, duration: 4.5 },
]

function FloatingCard({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: {
          duration: 3.2,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1D2155]/5 via-white to-[#20589A]/5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4EC4A920_1px,transparent_1px),linear-gradient(to_bottom,#4EC4A920_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute right-[-80px] top-8 h-80 w-80 rounded-full bg-gradient-to-br from-[#4EC4A9] to-[#20589A] blur-3xl"
        />

        <motion.div
          animate={{
            scale: [1, 1.22, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.8,
          }}
          className="absolute bottom-[-120px] left-[-80px] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-[#20589A] to-[#1D2155] blur-3xl"
        />

        {floatingParticles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#4EC4A9]"
            style={{ left: particle.left, top: particle.top }}
            animate={{
              y: [0, -26, 0],
              opacity: [0, 0.65, 0],
              scale: [0.8, 1.1, 0.8],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#4EC4A9]/30 bg-gradient-to-r from-[#4EC4A9]/20 to-[#20589A]/20 px-4 py-2 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-[#4EC4A9]" strokeWidth={2} />
              </motion.div>
              <span className="text-sm font-medium text-[#1D2155]">
                Planificador inteligente con IA
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mb-6 text-4xl font-bold leading-tight text-[#1D2155] sm:text-5xl lg:text-6xl"
            >
              Tu semana{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#4EC4A9] via-[#20589A] to-[#1D2155] bg-clip-text text-transparent">
                  bajo control
                </span>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute -bottom-2 left-0 h-1 rounded-full bg-gradient-to-r from-[#4EC4A9] to-[#20589A]"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-600 lg:mx-0 lg:max-w-none lg:text-xl"
            >
              El planificador que entiende tu ritmo de estudio. Organiza tareas,
              exámenes y tiempo libre sin estrés. Con IA que te ayuda cuando más
              lo necesitas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26 }}
              className="mb-8 flex flex-wrap justify-center gap-3 lg:justify-start"
            >
              {[
                { icon: Brain, text: 'IA inteligente' },
                { icon: Calendar, text: 'Vista semanal' },
                { icon: Zap, text: 'Super rápido' },
              ].map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 backdrop-blur-sm"
                >
                  <feature.icon className="h-4 w-4 text-[#4EC4A9]" strokeWidth={2} />
                  <span className="text-sm font-medium text-[#1D2155]">
                    {feature.text}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.34 }}
              className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link href="/login">
                  <LandingButton
                    size="lg"
                    className="group relative min-w-[210px] overflow-hidden bg-gradient-to-r from-[#4EC4A9] to-[#20589A] shadow-lg shadow-[#4EC4A9]/20"
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.5 }}
                    />
                    <Sparkles className="relative z-10 h-5 w-5" strokeWidth={2} />
                    <span className="relative z-10">Empieza gratis</span>
                  </LandingButton>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <button className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-2xl border-2 border-[#20589A]/20 bg-white/70 px-6 py-3.5 text-base font-medium text-[#1D2155] backdrop-blur-sm transition-all duration-200 hover:border-[#20589A]/40 hover:bg-white">
                  <Play className="h-5 w-5" strokeWidth={2} />
                  Ver demo
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.42 }}
              className="flex flex-wrap items-center justify-center gap-6 lg:justify-start"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['A', 'B', 'C', 'D'].map((letter, i) => (
                    <motion.div
                      key={letter}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.55 + i * 0.08 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#4EC4A9] to-[#20589A] text-xs font-semibold text-white"
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>
                <span className="text-sm font-semibold text-[#1D2155]">
                  +10K usuarios
                </span>
              </div>

              <div className="flex items-center gap-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, rotate: -180 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      transition={{ delay: 0.65 + i * 0.05 }}
                    >
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                    </motion.div>
                  ))}
                </div>
                <span className="ml-1 text-sm font-semibold text-[#1D2155]">
                  4.9/5
                </span>
              </div>
            </motion.div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative h-[600px] w-full">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute left-1/2 top-1/2 h-96 w-80 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-slate-200/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#4EC4A9] to-[#20589A]">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      <div className="mt-1 h-3 w-16 rounded bg-slate-100" />
                    </div>
                  </div>

                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.48 + i * 0.1 }}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-slate-50/80 p-3"
                    >
                      <div className="h-5 w-5 rounded-full border-2 border-[#4EC4A9] bg-[#4EC4A9]/20" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-full rounded bg-slate-200" />
                        <div className="h-2 w-2/3 rounded bg-slate-100" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <FloatingCard
                delay={0.6}
                className="absolute -left-6 top-10 h-24 w-48 rounded-2xl border border-white/20 bg-gradient-to-br from-[#4EC4A9]/90 to-[#20589A]/90 p-4 shadow-xl backdrop-blur-xl"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                  <div>
                    <div className="mb-1 text-sm font-semibold text-white">
                      Matemáticas
                    </div>
                    <div className="text-xs text-white/80">Ejercicios cap. 5</div>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                delay={0.82}
                className="absolute -right-8 top-32 h-20 w-40 rounded-2xl border border-white/20 bg-gradient-to-br from-[#1D2155]/90 to-[#20589A]/90 p-3 shadow-xl backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#4EC4A9]" />
                  <span className="text-xs font-medium text-white">2:30 PM</span>
                </div>
                <div className="text-xs text-white/80">Repaso de Historia</div>
              </FloatingCard>

              <FloatingCard
                delay={1}
                className="absolute -left-10 bottom-20 h-28 w-44 rounded-2xl border border-[#4EC4A9]/30 bg-white/85 p-4 shadow-xl backdrop-blur-xl"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#20589A]" />
                  <span className="text-sm font-semibold text-[#1D2155]">
                    IA Asistente
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-[#1D2155]/70">
                  "Tienes 3 tareas por completar hoy"
                </div>
              </FloatingCard>

              <FloatingCard
                delay={1.2}
                className="absolute bottom-10 right-0 flex h-16 w-36 items-center gap-2 rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/20 to-[#4EC4A9]/20 p-3 shadow-xl backdrop-blur-xl"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#4EC4A9]">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1D2155]">85%</div>
                  <div className="text-xs text-slate-500">Progreso</div>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}