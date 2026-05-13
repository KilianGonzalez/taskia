'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FlexibleTaskRow } from '@/lib/actions/shared'
import {
  asNonEmptyString,
  validateDueDateNotPast,
  getErrorMessage,
} from '@/lib/actions/shared'
import {
  syncFlexibleTaskWithGoogleCalendar,
  syncFlexibleTasksWithGoogleCalendar,
  deleteGoogleCalendarTaskEvent,
} from '@/lib/actions/google'
import type { SessionInput } from '@/lib/actions/ai'
import { safeParseGoalPlan } from '@/lib/actions/ai'
import { GROQ_MODEL, AI_MAX_INPUT_TOKENS, countInputTokens, generateJson } from '@/lib/ai/groq'
import { toTaskPriorityLabel, toTaskPriorityLevel } from '@/lib/tasks/priority'
import type { ScheduledBlockRow } from '@/lib/actions/commitments'
import { calculateFreeSlots, assignTasksToSlots } from '@/lib/actions/planning'
import {
  performGoogleCalendarRequest,
  requestGoogleCalendarApi,
  mapGoogleCalendarEvent,
} from '@/lib/actions/google'
import type { User } from '@supabase/supabase-js'

function normalizeFlexibleTaskRow(task: FlexibleTaskRow) {
  return {
    id: task.id,
    user_id: task.user_id,
    title: task.title,
    category: task.category ?? undefined,
    priority: toTaskPriorityLabel(task.priority),
    due_date: task.due_date ?? undefined,
    estimated_duration_min: task.estimated_duration_min ?? undefined,
    difficulty: task.difficulty ?? undefined,
    notes: task.notes ?? undefined,
    completed: Boolean(task.completed),
    completed_at: task.completed_at ?? undefined,
    created_at: task.created_at ?? '',
  }
}

async function fetchGoogleCalendarBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  timeMin: string,
  timeMax: string
): Promise<ScheduledBlockRow[]> {
  try {
    const result = await performGoogleCalendarRequest<{ items?: unknown[] }>({
      supabase,
      user,
      execute: (accessToken) =>
        requestGoogleCalendarApi({
          accessToken,
          path:
            `calendars/primary/events?` +
            `timeMin=${encodeURIComponent(timeMin)}` +
            `&timeMax=${encodeURIComponent(timeMax)}` +
            `&singleEvents=true&orderBy=startTime`,
        }),
    })

    if (result.status !== 'ok' || !Array.isArray(result.data?.items)) return []

    return result.data.items
      .map(mapGoogleCalendarEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .filter((e) => e.start.includes('T') && e.end.includes('T'))
      .map((e) => ({
        id: e.id,
        user_id: user.id,
        title: e.title,
        start_datetime: e.start,
        end_datetime: e.end,
        block_type: 'google_calendar' as const,
        color: e.backgroundColor,
      }))
  } catch {
    return []
  }
}

export async function getFlexibleTasks(userId?: string) {
  const supabase = await createClient()

  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    targetUserId = user.id
  }

  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', targetUserId)
    .order('due_date', { ascending: true })
  if (error) { console.error('Error fetching tasks:', error); return [] }
  return ((data as FlexibleTaskRow[] | null) ?? []).map(normalizeFlexibleTaskRow)
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
  return ((data as FlexibleTaskRow[] | null) ?? []).map(normalizeFlexibleTaskRow)
}

export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: existingTask, error: existingTaskError } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (existingTaskError || !existingTask) {
    return { error: existingTaskError?.message ?? 'Tarea no encontrada' }
  }

  const nextTask: FlexibleTaskRow = {
    ...(existingTask as FlexibleTaskRow),
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  }

  const { error } = await supabase
    .from('flexible_tasks')
    .update({ completed: nextTask.completed, completed_at: nextTask.completed_at })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  await syncFlexibleTaskWithGoogleCalendar({ supabase, user, task: nextTask })
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
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

  const dueDate = asNonEmptyString(formData.due_date)
  if (dueDate) {
    const dueDateError = validateDueDateNotPast({ dueDate, entityLabel: 'la tarea' })
    if (dueDateError) return { error: dueDateError }
  }

  const taskToInsert = {
    ...formData,
    due_date: dueDate ?? undefined,
    category: formData.category?.trim() || 'general',
    priority: toTaskPriorityLevel(formData.priority),
    user_id: user.id,
    completed: false,
  }

  const { data: createdTask, error } = await supabase
    .from('flexible_tasks')
    .insert(taskToInsert)
    .select('*')
    .single()

  if (error) return { error: error.message }
  if (createdTask) {
    await syncFlexibleTaskWithGoogleCalendar({
      supabase,
      user,
      task: createdTask as FlexibleTaskRow,
    })
  }
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
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
  await deleteGoogleCalendarTaskEvent({ supabase, user, taskId })
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
  return { success: true }
}

export async function updateFlexibleTask(
  taskId: string,
  updates: { due_date?: string; estimated_duration_min?: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: existingTask, error: existingTaskError } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (existingTaskError || !existingTask) {
    return { error: existingTaskError?.message ?? 'Tarea no encontrada' }
  }

  const dueDate = asNonEmptyString(updates.due_date)
  if (dueDate) {
    const dueDateError = validateDueDateNotPast({ dueDate, entityLabel: 'la tarea' })
    if (dueDateError) return { error: dueDateError }
  }

  const { error } = await supabase
    .from('flexible_tasks')
    .update({ ...updates, due_date: dueDate ?? updates.due_date })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await syncFlexibleTaskWithGoogleCalendar({
    supabase,
    user,
    task: { ...(existingTask as FlexibleTaskRow), ...updates },
  })

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function prioritizeTask(taskId: string, action?: 'up' | 'down' | 'auto') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: task } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!task) return { error: 'Tarea no encontrada' }

  let newPriority: number

  if (action === 'auto') {
    const now = new Date()
    const dueDate = task.due_date ? new Date(task.due_date) : null
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const duration = task.estimated_duration_min || 30

    if (daysUntilDue !== null) {
      if (daysUntilDue <= 2) newPriority = 3
      else if (daysUntilDue <= 7) newPriority = 2
      else newPriority = 1
    } else {
      if (duration >= 90) newPriority = 3
      else if (duration >= 60) newPriority = 2
      else newPriority = 1
    }
  } else if (action === 'up') {
    newPriority = Math.min(toTaskPriorityLevel(task.priority) + 1, 3)
  } else if (action === 'down') {
    newPriority = Math.max(toTaskPriorityLevel(task.priority) - 1, 1)
  } else {
    newPriority = 3
  }

  const { error: updateError } = await supabase
    .from('flexible_tasks')
    .update({ priority: newPriority })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')

  return {
    success: true,
    message: `Tarea "${task.title}" con prioridad ${toTaskPriorityLabel(newPriority)} correctamente`,
  }
}

export async function splitTaskWithAI(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: task, error: taskError } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (taskError || !task) return { error: 'Tarea no encontrada' }

  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: scheduledBlocks, error: blocksError } = await supabase
    .from('scheduled_blocks')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_datetime', new Date().toISOString())
    .lte('start_datetime', weekAhead)
    .order('start_datetime', { ascending: true })

  if (blocksError) {
    console.error('Error obteniendo bloques del calendario:', blocksError)
  }

  const taskData = {
    title: task.title,
    description: task.notes || '',
    duration: task.estimated_duration_min || 30,
    difficulty: task.difficulty || 3,
    category: task.category || 'general',
    dueDate: task.due_date || null,
  }

  const calendarInfo = scheduledBlocks
    ? scheduledBlocks.map((block) => ({
        title: block.title,
        start: block.start_datetime,
        end: block.end_datetime,
        type: block.block_type || 'commitment',
      }))
    : []

  const prompt = `Divide esta tarea en sesiones más pequeñas manejables:

TAREA:
${JSON.stringify(taskData)}

COMPROMISOS CALENDARIO (próxima semana):
${JSON.stringify(calendarInfo)}

Responde solo JSON:
{"summary":"resumen breve","sessions":[{"title":"sesión","durationMin":25,"focus":"enfoque","reason":"razón","suggestedTime":"YYYY-MM-DDTHH:mm"}]}

Reglas:
- Sesiones de 25-90 min cada una
- Evita horarios que choquen con compromisos existentes
- Considera la dificultad de la tarea
- Summary: máx 100 chars
- Focus: máx 60 chars
- Reason: máx 80 chars
- SuggestedTime: formato ISO, considera preferiblemente mañana/tarde
- Máximo 5 sesiones
- Las sesiones deben sumar aproximadamente la duración total original`

  try {
    const estimatedInputTokens = await countInputTokens(prompt)

    if (estimatedInputTokens > AI_MAX_INPUT_TOKENS) {
      await supabase.from('ai_logs').insert({
        user_id: user.id,
        action: 'split_task',
        model: GROQ_MODEL,
        input_tokens_estimated: estimatedInputTokens,
        status: 'blocked',
        error_message: 'Prompt demasiado largo',
        request_payload: { taskId, promptPreview: prompt.slice(0, 1000) },
      })
      return { error: `El prompt supera el límite interno de ${AI_MAX_INPUT_TOKENS} tokens` }
    }

    const { text, usage } = await generateJson(prompt)
    const parsed = safeParseGoalPlan(text)

    if (!parsed.sessions.length) throw new Error('La IA no devolvió sesiones válidas')

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'split_task',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedInputTokens,
      prompt_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      thought_tokens: null,
      status: 'success',
      request_payload: { taskId, calendarEvents: calendarInfo.length },
      response_payload: parsed,
    })

    return { data: parsed }
  } catch (error: unknown) {
    console.error('splitTaskWithAI error:', error)

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'split_task',
      model: GROQ_MODEL,
      input_tokens_estimated: await countInputTokens(prompt),
      status: 'error',
      error_message: getErrorMessage(error),
      request_payload: { taskId },
    })

    return { error: getErrorMessage(error) || 'No se pudo dividir la tarea' }
  }
}

export async function createTasksFromSplitTask(params: {
  originalTaskId: string
  originalTaskTitle: string
  sessions: SessionInput[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const newTasks = params.sessions.map((session) => ({
      title: session.title,
      category: 'split_task',
      priority: 2,
      estimated_duration_min: session.durationMin,
      difficulty: 3,
      notes: `División de: ${params.originalTaskTitle}\nEnfoque: ${session.focus}\nRazón: ${session.reason}`,
      user_id: user.id,
      completed: false,
    }))

    const { data: createdTasks, error: insertError } = await supabase
      .from('flexible_tasks')
      .insert(newTasks)
      .select()

    if (insertError) {
      console.error('Error creando tareas divididas:', insertError)
      return { error: insertError.message }
    }

    const { error: updateError } = await supabase
      .from('flexible_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        notes: `[DIVIDIDA] ${params.originalTaskTitle}\nReemplazada por ${createdTasks?.length || 0} tareas más pequeñas.`,
      })
      .eq('id', params.originalTaskId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error actualizando tarea original:', updateError)
    }

    await deleteGoogleCalendarTaskEvent({ supabase, user, taskId: params.originalTaskId })

    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/calendar')

    return { success: true, created: createdTasks?.length || 0, tasks: createdTasks }
  } catch (error: unknown) {
    console.error('createTasksFromSplitTask error:', error)
    return { error: getErrorMessage(error) || 'Error al crear tareas divididas' }
  }
}

export async function distributeWeeklyTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const now = new Date()
    const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const [tasksResult, blocksResult] = await Promise.all([
      supabase
        .from('flexible_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false),
      supabase
        .from('scheduled_blocks')
        .select('*')
        .eq('user_id', user.id)
        .lt('start_datetime', twoWeeksAhead.toISOString())
        .gt('end_datetime', now.toISOString()),
    ])

    if (tasksResult.error) return { error: tasksResult.error.message }

    const allPending = tasksResult.data ?? []

    // "Plan semana" redistribuye TODAS las pendientes — plan limpio completo
    if (allPending.length === 0) {
      return { error: 'No tienes tareas pendientes para planificar' }
    }

    // Overdue first, then by priority desc, then shorter first
    const sorted = [...allPending].sort((a, b) => {
      const aOverdue = a.due_date && new Date(a.due_date) < now ? 1 : 0
      const bOverdue = b.due_date && new Date(b.due_date) < now ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue

      const ap = toTaskPriorityLevel(a.priority)
      const bp = toTaskPriorityLevel(b.priority)
      if (ap !== bp) return bp - ap

      return (a.estimated_duration_min || 30) - (b.estimated_duration_min || 30)
    })

    const googleBlocks = await fetchGoogleCalendarBlocks(
      supabase, user, now.toISOString(), twoWeeksAhead.toISOString()
    )
    const blocks = [...(blocksResult.data ?? []) as ScheduledBlockRow[], ...googleBlocks]
    const freeSlots = calculateFreeSlots(now, twoWeeksAhead, blocks)

    if (freeSlots.length === 0) {
      return { error: 'No hay huecos libres en las próximas 2 semanas para asignar tareas' }
    }

    const assignments = assignTasksToSlots(sorted, freeSlots)

    if (assignments.length === 0) {
      return { error: 'Las tareas no caben en los huecos disponibles' }
    }

    const updatedTasks = assignments.map(({ task, startTime }) => ({
      ...task,
      due_date: startTime.toISOString(),
    })) as FlexibleTaskRow[]

    const { error: updateError } = await supabase
      .from('flexible_tasks')
      .upsert(updatedTasks, { onConflict: 'id' })

    if (updateError) return { error: updateError.message }

    await syncFlexibleTasksWithGoogleCalendar({ supabase, user, tasks: updatedTasks })

    revalidatePath('/dashboard/calendar')
    revalidatePath('/dashboard/tasks')

    const remaining = allPending.length - assignments.length
    return {
      success: true,
      message:
        remaining > 0
          ? `${assignments.length} tareas repartidas. ${remaining} no caben esta quincena.`
          : `${assignments.length} tareas repartidas en los próximos 14 días.`,
      distributed: assignments.length,
      remaining,
    }
  } catch (error) {
    console.error('Error distribuyendo tareas:', error)
    return { error: 'Error al distribuir tareas' }
  }
}

export async function autoReorderAllTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tasks, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)

  if (error) return { error: error.message }
  if (!tasks || tasks.length === 0) return { error: 'No hay tareas pendientes para priorizar' }

  const now = new Date()
  const updates: Array<{ id: string; priority: number }> = []

  for (const task of tasks) {
    const dueDate = task.due_date ? new Date(task.due_date) : null
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const duration = task.estimated_duration_min || 30
    const difficulty = task.difficulty || 2

    let newPriority: number

    if (daysUntilDue !== null && daysUntilDue < 0) {
      newPriority = 3 // vencida → siempre alta
    } else if (daysUntilDue !== null) {
      if (daysUntilDue <= 2) newPriority = 3
      else if (daysUntilDue <= 7) newPriority = 2
      else newPriority = 1
    } else {
      // Sin fecha: puntuación por duración + dificultad
      const score = duration / 30 + difficulty
      newPriority = score >= 5 ? 3 : score >= 3 ? 2 : 1
    }

    if (toTaskPriorityLevel(task.priority) !== newPriority) {
      updates.push({ id: task.id, priority: newPriority })
    }
  }

  if (updates.length === 0) {
    return { success: true, message: 'Las prioridades ya están al día', changed: 0 }
  }

  await Promise.all(
    updates.map(({ id, priority }) =>
      supabase
        .from('flexible_tasks')
        .update({ priority })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')

  return {
    success: true,
    message: `${updates.length} tareas reordenadas automáticamente`,
    changed: updates.length,
  }
}

export async function planToday() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(21, 0, 0, 0)

  if (now >= todayEnd) {
    return { error: 'Ya es demasiado tarde para planificar tareas hoy' }
  }

  const [tasksResult, blocksResult] = await Promise.all([
    supabase
      .from('flexible_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false),
    supabase
      .from('scheduled_blocks')
      .select('*')
      .eq('user_id', user.id)
      .lt('start_datetime', todayEnd.toISOString())
      .gt('end_datetime', now.toISOString()),
  ])

  if (tasksResult.error) return { error: tasksResult.error.message }

  const googleBlocks = await fetchGoogleCalendarBlocks(
    supabase, user, now.toISOString(), todayEnd.toISOString()
  )
  const blocks = [...(blocksResult.data ?? []) as ScheduledBlockRow[], ...googleBlocks]
  const freeSlots = calculateFreeSlots(now, todayEnd, blocks)

  const totalFreeMinutes = freeSlots.reduce((sum, s) => sum + s.availableMinutes, 0)
  if (totalFreeMinutes < 25) {
    return { error: 'No tienes tiempo libre suficiente hoy para asignar tareas' }
  }

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // "Plan hoy" planifica: sin fecha + overdue + las de hoy (reasigna mejor hora)
  const todayTasks = (tasksResult.data ?? []).filter((t) => {
    if (!t.due_date) return true
    const d = new Date(t.due_date)
    return d < now || (d >= todayStart && d <= todayEnd)
  })

  if (todayTasks.length === 0) {
    return { error: 'No hay tareas sin fecha ni tareas de hoy para planificar' }
  }

  const sorted = [...todayTasks].sort((a, b) => {
    const ap = toTaskPriorityLevel(a.priority)
    const bp = toTaskPriorityLevel(b.priority)
    if (ap !== bp) return bp - ap
    return (a.estimated_duration_min || 30) - (b.estimated_duration_min || 30)
  })

  const assignments = assignTasksToSlots(sorted, freeSlots)

  if (assignments.length === 0) {
    return { error: 'Las tareas pendientes no caben en los huecos de hoy' }
  }

  const updatedTasks = assignments.map(({ task, startTime }) => ({
    ...task,
    due_date: startTime.toISOString(),
  })) as FlexibleTaskRow[]

  const { error: updateError } = await supabase
    .from('flexible_tasks')
    .upsert(updatedTasks, { onConflict: 'id' })

  if (updateError) return { error: updateError.message }

  await syncFlexibleTasksWithGoogleCalendar({ supabase, user, tasks: updatedTasks })

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')

  return {
    success: true,
    message: `${assignments.length} tareas planificadas para hoy (${Math.round(totalFreeMinutes / 60 * 10) / 10}h libres)`,
    planned: assignments.length,
  }
}

export async function planWeekWithAI() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const now = new Date()
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [tasksResult, blocksResult] = await Promise.all([
    supabase
      .from('flexible_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false),
    supabase
      .from('scheduled_blocks')
      .select('*')
      .eq('user_id', user.id)
      .lt('start_datetime', weekEnd.toISOString())
      .gt('end_datetime', now.toISOString()),
  ])

  if (tasksResult.error) return { error: tasksResult.error.message }

  const allPending = tasksResult.data ?? []

  if (allPending.length === 0) {
    return { error: 'No tienes tareas pendientes para planificar' }
  }

  const googleBlocks = await fetchGoogleCalendarBlocks(
    supabase, user, now.toISOString(), weekEnd.toISOString()
  )
  const blocks = [...(blocksResult.data ?? []) as ScheduledBlockRow[], ...googleBlocks]
  const freeSlots = calculateFreeSlots(now, weekEnd, blocks).slice(0, 15)

  if (freeSlots.length === 0) {
    return { error: 'No hay huecos libres esta semana' }
  }

  // Limitar a 10 tareas para mantener el prompt dentro del límite de tokens
  const topTasks = [...allPending]
    .sort((a, b) => toTaskPriorityLevel(b.priority) - toTaskPriorityLevel(a.priority))
    .slice(0, 10)

  const tasksJson = topTasks.map((t) => ({
    id: t.id,
    title: t.title.slice(0, 40),
    min: t.estimated_duration_min || 30,
    priority: toTaskPriorityLabel(t.priority),
    difficulty: t.difficulty || 2,
  }))

  const slotsJson = freeSlots.map((s) => ({
    date: s.date,
    from: s.start.toTimeString().slice(0, 5),
    to: s.end.toTimeString().slice(0, 5),
    availMin: s.availableMinutes,
  }))

  const prompt = `Planificador para adolescentes. Asigna estas tareas a los huecos libres.

TAREAS:
${JSON.stringify(tasksJson)}

HUECOS:
${JSON.stringify(slotsJson)}

Reglas: prioridad alta va primero, dificultad>=4 en mañana (<13h), deja 15min entre tareas, asigna el máximo posible.

Solo JSON: {"assignments":[{"taskId":"...","startTime":"YYYY-MM-DDTHH:mm"}],"summary":"resumen breve"}`

  const estimatedTokens = await countInputTokens(prompt)

  if (estimatedTokens > AI_MAX_INPUT_TOKENS) {
    return { error: 'Demasiadas tareas. Usa "Planificar semana" para distribución automática.' }
  }

  try {
    const { text, usage } = await generateJson(prompt)

    let parsed: { assignments: Array<{ taskId: string; startTime: string }>; summary?: string }
    try {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match?.[0] ?? text)
    } catch {
      throw new Error('La IA no devolvió un plan válido')
    }

    if (!Array.isArray(parsed.assignments) || parsed.assignments.length === 0) {
      throw new Error('La IA no devolvió asignaciones')
    }

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'plan_week_ai',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedTokens,
      prompt_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      status: 'success',
      request_payload: { taskCount: topTasks.length, slotCount: freeSlots.length },
      response_payload: parsed,
    })

    const seenIds = new Set<string>()
    const updatedTasks = parsed.assignments
      .map((a) => {
        const task = allPending.find((t) => t.id === a.taskId)
        if (!task || !a.startTime) return null
        return { ...task, due_date: a.startTime }
      })
      .filter(Boolean)
      .filter((t) => {
        if (seenIds.has((t as FlexibleTaskRow).id)) return false
        seenIds.add((t as FlexibleTaskRow).id)
        return true
      }) as FlexibleTaskRow[]

    if (updatedTasks.length === 0) {
      return { error: 'El plan de la IA no coincide con las tareas actuales' }
    }

    const { error: updateError } = await supabase
      .from('flexible_tasks')
      .upsert(updatedTasks, { onConflict: 'id' })

    if (updateError) return { error: updateError.message }

    await syncFlexibleTasksWithGoogleCalendar({ supabase, user, tasks: updatedTasks })

    revalidatePath('/dashboard/calendar')
    revalidatePath('/dashboard/tasks')

    return {
      success: true,
      message: parsed.summary || `IA ha planificado ${updatedTasks.length} tareas para esta semana`,
      planned: updatedTasks.length,
    }
  } catch (error) {
    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'plan_week_ai',
      model: GROQ_MODEL,
      input_tokens_estimated: estimatedTokens,
      status: 'error',
      error_message: getErrorMessage(error),
      request_payload: { taskCount: topTasks.length },
    })
    return { error: getErrorMessage(error) || 'No se pudo generar el plan con IA' }
  }
}

export async function rescheduleOverdueTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const now = new Date()

  const { data: overdue, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)
    .lt('due_date', now.toISOString())

  if (error) return { error: error.message }
  if (!overdue || overdue.length === 0) return { error: 'No hay tareas vencidas' }

  // Marcar todas como alta prioridad primero
  await Promise.all(
    overdue.map((t) =>
      supabase
        .from('flexible_tasks')
        .update({ priority: 3 })
        .eq('id', t.id)
        .eq('user_id', user.id)
    )
  )

  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const { data: blocksData } = await supabase
    .from('scheduled_blocks')
    .select('*')
    .eq('user_id', user.id)
    .lt('start_datetime', weekEnd.toISOString())
    .gt('end_datetime', now.toISOString())

  const googleBlocks = await fetchGoogleCalendarBlocks(
    supabase, user, now.toISOString(), weekEnd.toISOString()
  )
  const blocks = [...(blocksData ?? []) as ScheduledBlockRow[], ...googleBlocks]
  const freeSlots = calculateFreeSlots(now, weekEnd, blocks)
  const highPriorityTasks = overdue.map((t) => ({ ...t, priority: 3 }))
  const assignments = assignTasksToSlots(highPriorityTasks, freeSlots)

  if (assignments.length === 0) {
    revalidatePath('/dashboard/tasks')
    return {
      success: true,
      message: `${overdue.length} tareas vencidas marcadas como alta prioridad. Sin huecos esta semana para reprogramar.`,
      rescheduled: 0,
    }
  }

  const updatedTasks = assignments.map(({ task, startTime }) => ({
    ...task,
    due_date: startTime.toISOString(),
    priority: 3,
  })) as FlexibleTaskRow[]

  const { error: updateError } = await supabase
    .from('flexible_tasks')
    .upsert(updatedTasks, { onConflict: 'id' })

  if (updateError) return { error: updateError.message }

  await syncFlexibleTasksWithGoogleCalendar({ supabase, user, tasks: updatedTasks })

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')

  return {
    success: true,
    message: `${assignments.length} tareas vencidas reprogramadas con prioridad alta`,
    rescheduled: assignments.length,
  }
}
