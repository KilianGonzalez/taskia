'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FlexibleTaskRow } from '@/lib/actions/shared'
import { asNonEmptyString, validateDueDateNotPast, getErrorMessage } from '@/lib/actions/shared'
import { syncFlexibleTasksWithGoogleCalendar } from '@/lib/actions/google'
import type { SessionInput } from '@/lib/actions/ai'
import { buildGoalPrompt, safeParseGoalPlan } from '@/lib/actions/ai'
import { GROQ_MODEL, AI_MAX_INPUT_TOKENS, countInputTokens, generateJson } from '@/lib/ai/groq'

export async function getGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error)
    return []
  }

  return data
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

  const { error: dbError } = await supabase
    .from('goals')
    .update({
      current_value: newValue,
      status: isCompleted ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (dbError) return { error: dbError.message }
  revalidatePath('/dashboard/goals')
  return { success: true }
}

export async function createGoal(formData: {
  title: string
  description?: string
  category: string
  target_value: number
  unit: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const dueDate = asNonEmptyString(formData.due_date)
  if (dueDate) {
    const dueDateError = validateDueDateNotPast({ dueDate, entityLabel: 'el objetivo' })
    if (dueDateError) return { error: dueDateError }
  }

  const { error } = await supabase
    .from('goals')
    .insert({
      ...formData,
      due_date: dueDate ?? undefined,
      user_id: user.id,
      current_value: 0,
      status: 'active',
      streak: 0,
    })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/goals')
  return { success: true }
}

export async function prioritizeGoal(goalId: string, action?: 'up' | 'down' | 'auto') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (!goal) return { error: 'Objetivo no encontrado' }

  let newPriority: 'low' | 'medium' | 'high'

  if (action === 'auto') {
    const now = new Date()
    const dueDate = goal.due_date ? new Date(goal.due_date) : null
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (daysUntilDue !== null) {
      if (daysUntilDue <= 7) newPriority = 'high'
      else if (daysUntilDue <= 21) newPriority = 'medium'
      else newPriority = 'low'
    } else {
      newPriority = 'medium'
    }
  } else if (action === 'up') {
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const currentIndex = priorities.indexOf(goal.priority || 'medium')
    newPriority = priorities[Math.min(currentIndex + 1, 2)]
  } else if (action === 'down') {
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const currentIndex = priorities.indexOf(goal.priority || 'medium')
    newPriority = priorities[Math.max(currentIndex - 1, 0)]
  } else {
    newPriority = 'high'
  }

  const { error: updateError } = await supabase
    .from('goals')
    .update({ priority: newPriority, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }
  revalidatePath('/dashboard/goals')
  revalidatePath('/dashboard/calendar')

  const priorityLabels = { low: 'baja', medium: 'media', high: 'alta' }
  return {
    success: true,
    message: `Objetivo "${goal.title}" con prioridad ${priorityLabels[newPriority]} correctamente`,
  }
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

export async function suggestGoalSessions(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, title, description, category, current_value, target_value, unit, due_date')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (goalError || !goal) return { error: 'Objetivo no encontrado' }

  if (goal.category !== 'academic') {
    return { error: 'Esta acción solo está disponible para objetivos académicos' }
  }

  const prompt = buildGoalPrompt(goal)
  const estimatedInputTokens = await countInputTokens(prompt)

  if (estimatedInputTokens > AI_MAX_INPUT_TOKENS) {
    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      status: 'blocked',
      error_message: 'Prompt demasiado largo',
      request_payload: { goalId, promptPreview: prompt.slice(0, 1000) },
    })
    return { error: `El prompt supera el límite interno de ${AI_MAX_INPUT_TOKENS} tokens` }
  }

  try {
    const { text, usage } = await generateJson(prompt)
    const parsed = safeParseGoalPlan(text)

    if (!parsed.sessions.length) throw new Error('La IA no devolvió sesiones válidas')

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      prompt_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      thought_tokens: null,
      status: 'success',
      request_payload: { goalId },
      response_payload: parsed,
    })

    return { data: parsed }
  } catch (error: unknown) {
    console.error('suggestGoalSessions error:', error)

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      status: 'error',
      error_message: getErrorMessage(error),
      request_payload: { goalId },
    })

    return { error: getErrorMessage(error) || 'No se pudo generar la sugerencia' }
  }
}

export async function createTasksFromSuggestedSessions(params: {
  goalId: string
  goalTitle: string
  sessions: SessionInput[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  if (!params.goalId || !params.goalTitle) return { error: 'Faltan datos del objetivo' }

  if (!Array.isArray(params.sessions) || params.sessions.length === 0) {
    return { error: 'No hay sesiones para guardar' }
  }

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, title, due_date, category')
    .eq('id', params.goalId)
    .eq('user_id', user.id)
    .single()

  if (goalError || !goal) return { error: 'Objetivo no encontrado' }

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

  const { data: createdTasks, error } = await supabase
    .from('flexible_tasks')
    .insert(tasksToInsert)
    .select('*')

  if (error) return { error: error.message }

  if (createdTasks?.length) {
    await syncFlexibleTasksWithGoogleCalendar({
      supabase,
      user,
      tasks: createdTasks as FlexibleTaskRow[],
    })
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/goals')
  revalidatePath('/dashboard/calendar')

  return { success: true, created: tasksToInsert.length }
}
