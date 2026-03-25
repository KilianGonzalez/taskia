'use client'

import { motion } from 'framer-motion'
import { Quote, Star, ChevronDown } from 'lucide-react'

const testimonials = [
  {
    name: 'Lucía',
    role: '2º Bachillerato',
    text: 'Antes tenía mil cosas sueltas. Ahora veo mi semana clara y sé por dónde empezar.',
  },
  {
    name: 'Mario',
    role: 'Estudiante + deporte',
    text: 'Lo que más me gusta es que si un día no llego, no tengo que reorganizar todo yo.',
  },
  {
    name: 'Claudia',
    role: 'Universidad',
    text: 'Se siente ligero. No me obliga a seguir un horario perfecto, me ayuda a mantenerlo realista.',
  },
]

const faqs = [
  {
    question: '¿TaskIA hace el horario por mí?',
    answer:
      'Sí, te propone una planificación inicial y puede reajustarla cuando cambian tus días.',
  },
  {
    question: '¿Puedo mover bloques manualmente?',
    answer:
      'Sí, la idea es combinar sugerencias inteligentes con control manual para que el plan siga siendo tuyo.',
  },
  {
    question: '¿Sirve solo para estudiar?',
    answer:
      'No. También encaja compromisos personales, actividades y tiempo libre dentro de la misma semana.',
  },
]

export function Testimonials() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div id="testimonials" className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#1D2155] sm:text-4xl">
              Una sensación de control real
            </h2>
            <p className="text-lg leading-relaxed text-slate-600">
              Pensado para estudiantes que quieren organizarse mejor sin convertir
              su semana en otra fuente de presión.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <Quote className="h-8 w-8 text-[#4EC4A9]" />
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                    ))}
                  </div>
                </div>

                <p className="mb-6 leading-relaxed text-slate-600">“{item.text}”</p>

                <div>
                  <p className="font-semibold text-[#1D2155]">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div id="faq" className="rounded-[32px] border border-slate-200 bg-slate-50/70 p-8 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="mb-10 max-w-2xl"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#1D2155]">
              Preguntas frecuentes
            </h2>
            <p className="text-slate-600">
              Las dudas típicas antes de empezar a usar TaskIA.
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-[#1D2155]">{faq.question}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}