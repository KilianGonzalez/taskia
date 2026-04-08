'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  GEMINI_MODEL,
  AI_MAX_INPUT_TOKENS,
  countInputTokens,
  generateJson,
} from '@/lib/ai/gemini'


export async function getFlexibleTasks(userId?: string) {
  const supabase = await createClient();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
  if (error) { console.error('Error fetching tasks:', error); return [] }
  return data || []
}


export async function getScheduledBlocks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('scheduled_blocks')
    .select('*')
    .eq('user_id', user.id)
  if (error) { console.error('Error fetching blocks:', error); return [] }
  return data || []
}


export async function getGoogleCalendarEvents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()
  const googleToken = profile?.preferences?.google_calendar_token
  if (!googleToken) return []
  const timeMin = new Date(); timeMin.setDate(timeMin.getDate() - 28)
  const timeMax = new Date(); timeMax.setDate(timeMax.getDate() + 28)
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || []).map((event: any) => ({
      id: `google_${event.id}`,
      title: event.summary || 'Sin título',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      backgroundColor: '#10b981',
      borderColor: '#059669',
      extendedProps: { source: 'google', description: event.description, location: event.location }
    }))
  } catch { return [] }
}


export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, email, preferences')
    .eq('id', user.id)
    .single()
  const name = profile?.full_name || profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'
  const avatarUrl = profile?.preferences?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null
  return { id: user.id, email: profile?.email || user.email, name, avatarUrl }
}


export async function getTodayTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_date', todayStart.toISOString())
    .lte('due_date', todayEnd.toISOString())
    .order('due_date', { ascending: true })
  if (error) return []
  return data || []
}


export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pendingToday: 0, completedThisWeek: 0, activeGoals: 0, streak: 0 }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
  const [pendingRes, completedRes, goalsRes] = await Promise.all([
    supabase.from('flexible_tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', false).gte('due_date', todayStart.toISOString()),
    supabase.from('flexible_tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true).gte('updated_at', weekStart.toISOString()),
    supabase.from('goals').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'active'),
  ])
  return { pendingToday: pendingRes.count || 0, completedThisWeek: completedRes.count || 0, activeGoals: goalsRes.count || 0, streak: 0 }
}


// ✅ NUEVAS ACCIONES


export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { error } = await supabase
    .from('flexible_tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)


  if (error) return { error: error.message }
  revalidatePath('/dashboard/tasks')
  return { success: true }
}


export async function createTask(formData: {
  title: string
  category?: string
  priority?: string
  due_date?: string
  estimated_duration_min?: number
  difficulty?: number
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { error } = await supabase
    .from('flexible_tasks')
    .insert({
      ...formData,
      user_id: user.id,
      completed: false,
    })


  if (error) return { error: error.message }
  revalidatePath('/dashboard/tasks')
  return { success: true }
}


export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { error } = await supabase
    .from('flexible_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)


  if (error) return { error: error.message }
  revalidatePath('/dashboard/tasks')
  return { success: true }
}


// ── GOALS ──────────────────────────────────────────────


export async function createGoal(formData: {
  title: string
  description?: string
  category: string
  target_value: number
  unit: string
  due_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { error } = await supabase
    .from('goals')
    .insert({
      ...formData,
      user_id: user.id,
      current_value: 0,
      status: 'active',
      streak: 0,
    })


  if (error) return { error: error.message }
  revalidatePath('/dashboard/goals')
  return { success: true }
}


export async function updateGoalProgress(goalId: string, newValue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { data: goal } = await supabase
    .from('goals')
    .select('target_value')
    .eq('id', goalId)
    .single()


  const isCompleted = goal ? newValue >= goal.target_value : false


  const { error } = await supabase
    .from('goals')
    .update({
      current_value: newValue,
      status: isCompleted ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', user.id)


  if (error) return { error: error.message }
  revalidatePath('/dashboard/goals')
  return { success: true }
}


export async function deleteGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }


  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)


  if (error) return { error: error.message }
  revalidatePath('/dashboard/goals')
  return { success: true }
}


export async function getGoals() {
  const supabase = await createClient();


  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) return [];


  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });


  if (error) {
    console.error("Error fetching goals:", error);
    return [];
  }


  return data;
}


// ── AI: GOAL SESSIONS ──────────────────────────────────

type SuggestedSession = {
  title: string
  durationMin: number
  focus: string
  reason: string
}

type GoalPlanResult = {
  summary: string
  sessions: SuggestedSession[]
}

function buildGoalPrompt(goal: {
  id: string
  title: string
  description?: string | null
  category?: string | null
  current_value?: number | null
  target_value?: number | null
  unit?: string | null
  due_date?: string | null
}) {
  return [
    'Eres un asistente de planificación académica de TaskIA.',
    'Devuelve solo JSON válido, sin markdown, sin texto extra.',
    'Objetivo: convertir un objetivo académico en 3 a 5 sesiones realistas.',
    'Reglas:',
    '- sesiones cortas y realistas para estudiante',
    '- no repetir títulos',
    '- durationMin entre 25 y 90',
    '- summary máximo 140 caracteres',
    '- reason máximo 100 caracteres',
    '- focus máximo 80 caracteres',
    '',
    'Schema JSON exacto:',
    '{ "summary": "string", "sessions": [ { "title": "string", "durationMin": 45, "focus": "string", "reason": "string" } ] }',
    '',
    'Datos del objetivo:',
    JSON.stringify({
      id: goal.id,
      title: goal.title,
      description: goal.description ?? '',
      category: goal.category ?? '',
      current_value: goal.current_value ?? 0,
      target_value: goal.target_value ?? 0,
      unit: goal.unit ?? '',
      due_date: goal.due_date ?? null,
    }),
  ].join('\n')
}

function safeParseGoalPlan(text: string): GoalPlanResult {
  const parsed = JSON.parse(text)

  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions
      .map((s: any) => ({
        title: String(s.title ?? '').trim(),
        durationMin: Number(s.durationMin ?? 0),
        focus: String(s.focus ?? '').trim(),
        reason: String(s.reason ?? '').trim(),
      }))
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
}

export async function suggestGoalSessions(goalId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select(
      'id, title, description, category, current_value, target_value, unit, due_date'
    )
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (goalError || !goal) {
    return { error: 'Objetivo no encontrado' }
  }

  if (goal.category !== 'academic') {
    return { error: 'Esta acción solo está disponible para objetivos académicos' }
  }

  const prompt = buildGoalPrompt(goal)
  const estimatedInputTokens = await countInputTokens(prompt)

  if (estimatedInputTokens > AI_MAX_INPUT_TOKENS) {
    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GEMINI_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      status: 'blocked',
      error_message: 'Prompt demasiado largo',
      request_payload: { goalId, promptPreview: prompt.slice(0, 1000) },
    })

    return {
      error: `El prompt supera el límite interno de ${AI_MAX_INPUT_TOKENS} tokens`,
    }
  }

  try {
    const { text, usage } = await generateJson(prompt)
    const parsed = safeParseGoalPlan(text)

    if (!parsed.sessions.length) {
      throw new Error('La IA no devolvió sesiones válidas')
    }

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GEMINI_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      prompt_tokens: usage?.promptTokenCount ?? null,
      output_tokens: usage?.candidatesTokenCount ?? null,
      total_tokens: usage?.totalTokenCount ?? null,
      thought_tokens: usage?.thoughtsTokenCount ?? null,
      status: 'success',
      request_payload: { goalId },
      response_payload: parsed,
    })

    return { data: parsed }
  } catch (error: any) {
    console.error('suggestGoalSessions error:', error)

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GEMINI_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      status: 'error',
      error_message: error?.message ?? 'Error desconocido',
      request_payload: { goalId },
    })

    return { error: error?.message ?? 'No se pudo generar la sugerencia' }
  }
}

// ── AI: SAVE SUGGESTED SESSIONS ───────────────────────

type SessionInput = {
  title: string
  durationMin: number
  focus: string
  reason: string
}

export async function createTasksFromSuggestedSessions(params: {
  goalId: string
  goalTitle: string
  sessions: SessionInput[]
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (!params.goalId || !params.goalTitle) {
    return { error: 'Faltan datos del objetivo' }
  }

  if (!Array.isArray(params.sessions) || params.sessions.length === 0) {
    return { error: 'No hay sesiones para guardar' }
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, title, due_date, category')
    .eq('id', params.goalId)
    .eq('user_id', user.id)
    .single()

  if (goalError || !goal) {
    return { error: 'Objetivo no encontrado' }
  }

  const tasksToInsert = params.sessions.map((session, index) => ({
    user_id: user.id,
    title: session.title.trim(),
    category: 'study',
    priority: 2,
    estimated_duration_min: Math.max(25, Math.min(90, Math.round(session.durationMin))),
    difficulty: 2,
    due_date: goal.due_date || null,
    completed: false,
    notes: [
      `Creada por IA desde objetivo: ${params.goalTitle}`,
      `Focus: ${session.focus}`,
      `Reason: ${session.reason}`,
      `Goal ID: ${params.goalId}`,
      `Orden sugerido: ${index + 1}`,
    ].join('\n'),
    source: 'ai_goal_sessions',
  }))

  const { error } = await supabase
    .from('flexible_tasks')
    .insert(tasksToInsert)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/goals')

  return { success: true, created: tasksToInsert.length }
}