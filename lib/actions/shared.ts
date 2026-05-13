import { createClient } from '@/lib/supabase/server'

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type FlexibleTaskRow = {
  id: string
  user_id: string
  title: string
  category?: string | null
  priority?: string | number | null
  due_date?: string | null
  estimated_duration_min?: number | null
  difficulty?: number | null
  notes?: string | null
  completed?: boolean | null
  completed_at?: string | null
  created_at?: string | null
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

export function asNonEmptyString(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function isDateOnlyValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

export function validateDueDateNotPast(params: { dueDate: string; entityLabel: string }) {
  const dueDate = params.dueDate.trim()
  const now = new Date()

  if (isDateOnlyValue(dueDate)) {
    const [year, month, day] = dueDate.split('-').map(Number)
    const normalizedDate = new Date(year, month - 1, day, 0, 0, 0, 0)

    if (
      normalizedDate.getFullYear() !== year ||
      normalizedDate.getMonth() !== month - 1 ||
      normalizedDate.getDate() !== day
    ) {
      return `La fecha de ${params.entityLabel} no es válida`
    }

    if (normalizedDate < getStartOfToday()) {
      return `La fecha de ${params.entityLabel} no puede ser anterior a hoy`
    }

    return null
  }

  const parsedDate = new Date(dueDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return `La fecha de ${params.entityLabel} no es válida`
  }

  if (parsedDate < now) {
    return `La fecha de ${params.entityLabel} no puede estar en el pasado`
  }

  return null
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error desconocido'
}
