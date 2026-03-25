'use client'

import { FormEvent, useState } from 'react'
import { Loader2, Sparkles, Send } from 'lucide-react'

type AiCommandBarProps = {
  onSubmit: (prompt: string) => Promise<void>
  isLoading?: boolean
  placeholder?: string
  suggestions?: string[]
}

export function AiCommandBar({
  onSubmit,
  isLoading = false,
  placeholder = 'Ej. No me pongas tareas difíciles después de entrenar',
  suggestions = [
    'Reparte este trabajo en 3 sesiones',
    'Mueve el repaso al fin de semana',
    'Añade descansos cortos entre bloques',
  ],
}: AiCommandBarProps) {
  const [value, setValue] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const prompt = value.trim()
    if (!prompt || isLoading) return
    await onSubmit(prompt)
    setValue('')
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4EC4A9] to-[#20589A]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1D2155]">Asistente IA</p>
          <p className="text-xs text-slate-500">Pide cambios en lenguaje natural</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4EC4A9]/20 focus:border-[#4EC4A9]"
          />

          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1D2155] to-[#20589A] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isLoading ? 'Procesando...' : 'Aplicar'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setValue(suggestion)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#20589A]/20 hover:text-[#1D2155]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}