import { asObject, asNonEmptyString, getErrorMessage } from '@/lib/actions/shared'

export type SuggestedSession = {
  title: string
  durationMin: number
  focus: string
  reason: string
  suggestedTime?: string
}

export type GoalPlanResult = {
  summary: string
  sessions: SuggestedSession[]
}

export type SessionInput = {
  title: string
  durationMin: number
  focus: string
  reason: string
  suggestedTime?: string
}

export function buildGoalPrompt(goal: {
  id: string
  title: string
  description?: string | null
  category?: string | null
  current_value?: number | null
  target_value?: number | null
  unit?: string | null
  due_date?: string | null
}) {
  const goalData = {
    title: goal.title,
    description: goal.description || '',
    target: goal.target_value || 0,
    current: goal.current_value || 0,
    unit: goal.unit || '',
    due: goal.due_date || null,
  }

  return `Convierte este objetivo académico en 3-5 sesiones de estudio:
${JSON.stringify(goalData)}

Responde solo JSON:
{"summary":"resumen breve","sessions":[{"title":"sesión","durationMin":30,"focus":"enfoque","reason":"razón"}]}

Reglas:
- Sesiones de 25-90 min
- Títulos únicos y cortos
- Summary: máx 100 chars
- Focus: máx 60 chars
- Reason: máx 80 chars`
}

export function safeParseGoalPlan(text: string): GoalPlanResult {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '')
    }

    const parsed = asObject(JSON.parse(cleanText))

    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions
          .map((session) => {
            const parsedSession = asObject(session)
            return {
              title: String(parsedSession.title ?? '').trim(),
              durationMin: Number(parsedSession.durationMin ?? 0),
              focus: String(parsedSession.focus ?? '').trim(),
              reason: String(parsedSession.reason ?? '').trim(),
              suggestedTime: asNonEmptyString(parsedSession.suggestedTime) ?? undefined,
            }
          })
          .filter(
            (s: SuggestedSession) =>
              s.title &&
              Number.isFinite(s.durationMin) &&
              s.durationMin >= 25 &&
              s.durationMin <= 90
          )
          .slice(0, 5)
      : []

    return {
      summary: String(parsed.summary ?? '').trim().slice(0, 140),
      sessions,
    }
  } catch (error: unknown) {
    console.error('Error parsing goal plan JSON:', error)
    throw new Error(`La IA devolvió un formato no válido: ${getErrorMessage(error)}`)
  }
}
