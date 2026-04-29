'use server'

import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
  getGoogleAvatarUrl,
  getGoogleDisplayName,
  getStoredGoogleIntegrationState,
  mergeGoogleIntegrationPreferences,
  refreshGoogleAccessToken,
  shouldRefreshGoogleAccessToken,
} from '@/lib/google/integration'
import {
  GROQ_MODEL,
  AI_MAX_INPUT_TOKENS,
  countInputTokens,
  generateJson,
} from '@/lib/ai/groq'
import {
  toTaskPriorityLabel,
  toTaskPriorityLevel,
} from '@/lib/tasks/priority'

type CommitmentType = 'clase' | 'actividad' | 'otro'

type FixedCommitmentFormData = {
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
  color?: string
}

type FixedCommitmentRow = {
  id: string
  user_id: string
  title: string
  category?: string | null
  day_of_week?: string | number | null
  start_time?: string | null
  end_time?: string | null
  color?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

type ScheduledBlockRow = {
  id: string
  user_id: string
  title: string
  start_datetime: string
  end_datetime: string
  block_type?: string | null
  color?: string | null
  fixed_commitment_id?: string | null
  metadata?: Record<string, unknown> | null
  is_locked?: boolean | null
}

type FixedCommitmentView = {
  id: string
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
  color: string
  fixedCommitmentIds: string[]
  blockIds: string[]
  createdAt?: string | null
  source: 'fixed_commitment' | 'legacy_scheduled_block'
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type GoogleCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    source: 'google'
    description?: string
    location?: string
  }
}

type GoogleCalendarEventsResult = {
  events: GoogleCalendarEvent[]
  status: 'ok' | 'disconnected' | 'error'
  error?: string
}

type FlexibleTaskRow = {
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

type GoogleCalendarApiResponse<T> = {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

type GoogleCalendarRequestResult<T> = {
  status: 'ok' | 'disconnected' | 'error'
  httpStatus?: number
  data?: T | null
  error?: string
}

type GoogleCalendarAccessContext = {
  userId: string
  currentPreferences: unknown
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: string | null
  lastSyncError: string | null
}

const TASKIA_GOOGLE_TASK_EVENT_PREFIX = 'taskiatask'

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown) {
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

function validateDueDateNotPast(params: { dueDate: string; entityLabel: string }) {
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
      return `La fecha de ${params.entityLabel} no es vÃ¡lida`
    }

    if (normalizedDate < getStartOfToday()) {
      return `La fecha de ${params.entityLabel} no puede ser anterior a hoy`
    }

    return null
  }

  const parsedDate = new Date(dueDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return `La fecha de ${params.entityLabel} no es vÃ¡lida`
  }

  if (parsedDate < now) {
    return `La fecha de ${params.entityLabel} no puede estar en el pasado`
  }

  return null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error desconocido'
}

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

function getNormalizedGoogleCalendarRange(range?: {
  timeMin?: string
  timeMax?: string
}) {
  const defaultTimeMin = new Date()
  defaultTimeMin.setDate(defaultTimeMin.getDate() - 28)

  const defaultTimeMax = new Date()
  defaultTimeMax.setDate(defaultTimeMax.getDate() + 28)

  const timeMin = range?.timeMin ? new Date(range.timeMin) : defaultTimeMin
  const timeMax = range?.timeMax ? new Date(range.timeMax) : defaultTimeMax

  return {
    timeMin: Number.isNaN(timeMin.getTime())
      ? defaultTimeMin.toISOString()
      : timeMin.toISOString(),
    timeMax: Number.isNaN(timeMax.getTime())
      ? defaultTimeMax.toISOString()
      : timeMax.toISOString(),
  }
}

function mapGoogleCalendarEvent(rawEvent: unknown): GoogleCalendarEvent | null {
  const event = asObject(rawEvent)
  const start = asObject(event.start)
  const end = asObject(event.end)
  const id = asNonEmptyString(event.id)
  const startDate = asNonEmptyString(start.dateTime) ?? asNonEmptyString(start.date)
  const endDate = asNonEmptyString(end.dateTime) ?? asNonEmptyString(end.date)

  if (!id || isTaskiaGoogleTaskEventId(id) || !startDate || !endDate) {
    return null
  }

  return {
    id: `google_${id}`,
    title: asNonEmptyString(event.summary) ?? 'Sin título',
    start: startDate,
    end: endDate,
    backgroundColor: '#10b981',
    borderColor: '#059669',
    extendedProps: {
      source: 'google',
      ...(asNonEmptyString(event.description)
        ? { description: asNonEmptyString(event.description)! }
        : {}),
      ...(asNonEmptyString(event.location)
        ? { location: asNonEmptyString(event.location)! }
        : {}),
    },
  }
}

async function persistGoogleIntegrationPreferences(params: {
  supabase: SupabaseServerClient
  userId: string
  currentPreferences: unknown
  updates: Parameters<typeof mergeGoogleIntegrationPreferences>[1]
}) {
  const nextPreferences = mergeGoogleIntegrationPreferences(
    params.currentPreferences,
    params.updates
  )
  const currentState = getStoredGoogleIntegrationState(params.currentPreferences)
  const nextState = getStoredGoogleIntegrationState(nextPreferences)

  if (
    currentState.avatarUrl === nextState.avatarUrl &&
    currentState.accessToken === nextState.accessToken &&
    currentState.refreshToken === nextState.refreshToken &&
    currentState.accessTokenExpiresAt === nextState.accessTokenExpiresAt &&
    currentState.lastSyncError === nextState.lastSyncError
  ) {
    return nextPreferences
  }

  const { error } = await params.supabase
    .from('profiles')
    .update({
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId)

  if (error) {
    console.error('Error saving Google integration preferences:', error)
  }

  return nextPreferences
}

async function refreshGoogleCalendarAccessToken(params: {
  supabase: SupabaseServerClient
  userId: string
  currentPreferences: unknown
  refreshToken: string
}) {
  const refreshedToken = await refreshGoogleAccessToken(params.refreshToken)
  const updatedPreferences = await persistGoogleIntegrationPreferences({
    supabase: params.supabase,
    userId: params.userId,
    currentPreferences: params.currentPreferences,
    updates: {
      accessToken: refreshedToken.accessToken,
      refreshToken: refreshedToken.refreshToken ?? params.refreshToken,
      accessTokenExpiresAt: refreshedToken.accessTokenExpiresAt,
      lastSyncError: null,
    },
  })

  return {
    accessToken: refreshedToken.accessToken,
    refreshToken: refreshedToken.refreshToken ?? params.refreshToken,
    accessTokenExpiresAt: refreshedToken.accessTokenExpiresAt,
    preferences: updatedPreferences,
  }
}

function getTaskiaGoogleTaskEventId(taskId: string) {
  const normalizedTaskId = taskId.toLowerCase().replace(/[^a-v0-9]/g, '')
  return `${TASKIA_GOOGLE_TASK_EVENT_PREFIX}${normalizedTaskId}`
}

function isTaskiaGoogleTaskEventId(eventId: string | null | undefined) {
  return typeof eventId === 'string' && eventId.startsWith(TASKIA_GOOGLE_TASK_EVENT_PREFIX)
}

function isDateOnlyTaskDueDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) ||
    /T00:00(?::00(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)
  )
}

function addDaysToIsoDate(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day))
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

function buildGoogleCalendarTaskDescription(task: FlexibleTaskRow) {
  const descriptionParts = ['Creada en TaskIA']

  if (asNonEmptyString(task.category)) {
    descriptionParts.push(`Categoria: ${task.category}`)
  }

  if (task.priority !== null && task.priority !== undefined && String(task.priority).trim()) {
    descriptionParts.push(`Prioridad: ${toTaskPriorityLabel(task.priority)}`)
  }

  if (typeof task.estimated_duration_min === 'number' && Number.isFinite(task.estimated_duration_min)) {
    descriptionParts.push(
      `Duracion estimada: ${Math.max(Math.round(task.estimated_duration_min), 1)} min`
    )
  }

  descriptionParts.push(`TaskIA ID: ${task.id}`)

  const notes = asNonEmptyString(task.notes)
  if (notes) {
    descriptionParts.push('', notes)
  }

  return descriptionParts.join('\n')
}

function buildGoogleCalendarTaskEventPayload(task: FlexibleTaskRow) {
  const dueDate = asNonEmptyString(task.due_date)
  if (!dueDate) {
    return null
  }

  const summary = asNonEmptyString(task.title) ?? 'Sin titulo'
  const description = buildGoogleCalendarTaskDescription(task)
  const id = getTaskiaGoogleTaskEventId(task.id)

  if (isDateOnlyTaskDueDate(dueDate)) {
    const startDate = dueDate.slice(0, 10)

    return {
      id,
      summary,
      description,
      start: {
        date: startDate,
      },
      end: {
        date: addDaysToIsoDate(startDate, 1),
      },
    }
  }

  const startDate = new Date(dueDate)
  if (Number.isNaN(startDate.getTime())) {
    return null
  }

  const durationMinutes =
    typeof task.estimated_duration_min === 'number' && Number.isFinite(task.estimated_duration_min)
      ? Math.max(Math.round(task.estimated_duration_min), 15)
      : 60

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

  return {
    id,
    summary,
    description,
    start: {
      dateTime: startDate.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
  }
}

async function requestGoogleCalendarApi<T>(params: {
  accessToken: string
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  okStatusCodes?: number[]
}): Promise<GoogleCalendarApiResponse<T>> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/${params.path}`,
    {
      method: params.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
      cache: 'no-store',
    }
  )

  const responseText = await response.text().catch(() => '')
  let parsedPayload: unknown = null

  if (responseText) {
    try {
      parsedPayload = JSON.parse(responseText)
    } catch {
      parsedPayload = responseText
    }
  }

  const acceptedStatusCodes = params.okStatusCodes ?? []
  const isSuccessful = response.ok || acceptedStatusCodes.includes(response.status)

  if (!isSuccessful) {
    const parsedObject = asObject(parsedPayload)
    const errorObject = asObject(parsedObject.error)
    const errorMessage =
      asNonEmptyString(errorObject.message) ??
      asNonEmptyString(parsedPayload) ??
      `Google Calendar API returned ${response.status}`

    return {
      ok: false,
      status: response.status,
      data: null,
      error: errorMessage,
    }
  }

  return {
    ok: true,
    status: response.status,
    data: (parsedPayload as T | null) ?? null,
    error: null,
  }
}

async function getGoogleCalendarAccessContext(params: {
  supabase: SupabaseServerClient
  user: User
}): Promise<GoogleCalendarAccessContext> {
  const [
    { data: profile },
    {
      data: { session },
    },
  ] = await Promise.all([
    params.supabase
      .from('profiles')
      .select('preferences')
      .eq('id', params.user.id)
      .maybeSingle(),
    params.supabase.auth.getSession(),
  ])

  let currentPreferences = profile?.preferences
  const storedGoogleState = getStoredGoogleIntegrationState(currentPreferences)
  const sessionAccessToken = session?.provider_token ?? null
  const sessionRefreshToken = session?.provider_refresh_token ?? null
  const googleAvatarUrl = getGoogleAvatarUrl(params.user)

  if (
    (sessionAccessToken && sessionAccessToken !== storedGoogleState.accessToken) ||
    (sessionRefreshToken && sessionRefreshToken !== storedGoogleState.refreshToken) ||
    (googleAvatarUrl && googleAvatarUrl !== storedGoogleState.avatarUrl) ||
    storedGoogleState.lastSyncError
  ) {
    currentPreferences = await persistGoogleIntegrationPreferences({
      supabase: params.supabase,
      userId: params.user.id,
      currentPreferences,
      updates: {
        avatarUrl: googleAvatarUrl,
        accessToken: sessionAccessToken,
        refreshToken: sessionRefreshToken,
        lastSyncError: null,
      },
    })
  }

  let googleState = getStoredGoogleIntegrationState(currentPreferences)
  let accessToken = sessionAccessToken ?? googleState.accessToken
  let refreshToken = sessionRefreshToken ?? googleState.refreshToken
  let accessTokenExpiresAt = googleState.accessTokenExpiresAt

  if (
    refreshToken &&
    (!accessToken || shouldRefreshGoogleAccessToken(accessTokenExpiresAt))
  ) {
    try {
      const refreshedGoogleState = await refreshGoogleCalendarAccessToken({
        supabase: params.supabase,
        userId: params.user.id,
        currentPreferences,
        refreshToken,
      })

      currentPreferences = refreshedGoogleState.preferences
      accessToken = refreshedGoogleState.accessToken
      refreshToken = refreshedGoogleState.refreshToken
      accessTokenExpiresAt = refreshedGoogleState.accessTokenExpiresAt
      googleState = getStoredGoogleIntegrationState(currentPreferences)
    } catch (error) {
      console.error('Error refreshing Google Calendar token while resolving access:', error)
    }
  }

  return {
    userId: params.user.id,
    currentPreferences,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    lastSyncError: googleState.lastSyncError,
  }
}

async function performGoogleCalendarRequest<T>(params: {
  supabase: SupabaseServerClient
  user: User
  execute: (accessToken: string) => Promise<GoogleCalendarApiResponse<T>>
}): Promise<GoogleCalendarRequestResult<T>> {
  const accessContext = await getGoogleCalendarAccessContext({
    supabase: params.supabase,
    user: params.user,
  })

  let currentPreferences = accessContext.currentPreferences
  let accessToken = accessContext.accessToken
  let refreshToken = accessContext.refreshToken
  let accessTokenExpiresAt = accessContext.accessTokenExpiresAt

  if (!accessToken) {
    return { status: 'disconnected' }
  }

  try {
    let response = await params.execute(accessToken)

    if (!response.ok && response.status === 401 && refreshToken) {
      try {
        const refreshedGoogleState = await refreshGoogleCalendarAccessToken({
          supabase: params.supabase,
          userId: accessContext.userId,
          currentPreferences,
          refreshToken,
        })

        currentPreferences = refreshedGoogleState.preferences
        accessToken = refreshedGoogleState.accessToken
        refreshToken = refreshedGoogleState.refreshToken
        accessTokenExpiresAt = refreshedGoogleState.accessTokenExpiresAt
        response = await params.execute(accessToken)
      } catch (error) {
        console.error('Error refreshing Google Calendar token after 401:', error)
      }
    }

    if (!response.ok) {
      const lastSyncError =
        response.status === 401
          ? 'Google Calendar authorization expired. Reconnect Google to continue syncing.'
          : response.error

      await persistGoogleIntegrationPreferences({
        supabase: params.supabase,
        userId: accessContext.userId,
        currentPreferences,
        updates: {
          lastSyncError,
          accessTokenExpiresAt,
        },
      })

      return {
        status: response.status === 401 ? 'disconnected' : 'error',
        httpStatus: response.status,
        error: response.error ?? undefined,
      }
    }

    if (getStoredGoogleIntegrationState(currentPreferences).lastSyncError) {
      await persistGoogleIntegrationPreferences({
        supabase: params.supabase,
        userId: accessContext.userId,
        currentPreferences,
        updates: {
          lastSyncError: null,
          accessTokenExpiresAt,
        },
      })
    }

    return {
      status: 'ok',
      httpStatus: response.status,
      data: response.data,
    }
  } catch (error) {
    console.error('Unexpected Google Calendar request error:', error)

    await persistGoogleIntegrationPreferences({
      supabase: params.supabase,
      userId: accessContext.userId,
      currentPreferences,
      updates: {
        lastSyncError: 'Unexpected Google Calendar sync error',
        accessTokenExpiresAt,
      },
    })

    return {
      status: 'error',
      error: 'Unexpected Google Calendar sync error',
    }
  }
}

async function deleteGoogleCalendarTaskEvent(params: {
  supabase: SupabaseServerClient
  user: User
  taskId: string
}) {
  return performGoogleCalendarRequest({
    supabase: params.supabase,
    user: params.user,
    execute: (accessToken) =>
      requestGoogleCalendarApi({
        accessToken,
        path: `calendars/primary/events/${encodeURIComponent(
          getTaskiaGoogleTaskEventId(params.taskId)
        )}`,
        method: 'DELETE',
        okStatusCodes: [404],
      }),
  })
}

async function upsertGoogleCalendarTaskEvent(params: {
  supabase: SupabaseServerClient
  user: User
  task: FlexibleTaskRow
}) {
  const eventPayload = buildGoogleCalendarTaskEventPayload(params.task)
  if (!eventPayload) {
    return { status: 'ok' as const }
  }

  const eventId = getTaskiaGoogleTaskEventId(params.task.id)

  const updateResult = await performGoogleCalendarRequest({
    supabase: params.supabase,
    user: params.user,
    execute: (accessToken) =>
      requestGoogleCalendarApi({
        accessToken,
        path: `calendars/primary/events/${encodeURIComponent(eventId)}`,
        method: 'PUT',
        body: eventPayload,
      }),
  })

  if (updateResult.status === 'ok' || updateResult.status === 'disconnected') {
    return updateResult
  }

  if (updateResult.httpStatus !== 404) {
    return updateResult
  }

  const createResult = await performGoogleCalendarRequest({
    supabase: params.supabase,
    user: params.user,
    execute: (accessToken) =>
      requestGoogleCalendarApi({
        accessToken,
        path: 'calendars/primary/events',
        method: 'POST',
        body: eventPayload,
      }),
  })

  if (createResult.status === 'error' && createResult.httpStatus === 409) {
    return performGoogleCalendarRequest({
      supabase: params.supabase,
      user: params.user,
      execute: (accessToken) =>
        requestGoogleCalendarApi({
          accessToken,
          path: `calendars/primary/events/${encodeURIComponent(eventId)}`,
          method: 'PUT',
          body: eventPayload,
        }),
    })
  }

  return createResult
}

async function syncFlexibleTaskWithGoogleCalendar(params: {
  supabase: SupabaseServerClient
  user: User
  task: FlexibleTaskRow
}) {
  const dueDate = asNonEmptyString(params.task.due_date)

  const result =
    params.task.completed || !dueDate
      ? await deleteGoogleCalendarTaskEvent({
          supabase: params.supabase,
          user: params.user,
          taskId: params.task.id,
        })
      : await upsertGoogleCalendarTaskEvent(params)

  if (result.status === 'error') {
    console.error('Error syncing TaskIA task to Google Calendar:', {
      taskId: params.task.id,
      error: result.error,
      httpStatus: result.httpStatus,
    })
  }

  return result
}

async function syncFlexibleTasksWithGoogleCalendar(params: {
  supabase: SupabaseServerClient
  user: User
  tasks: FlexibleTaskRow[]
}) {
  const syncResults = await Promise.allSettled(
    params.tasks.map((task) =>
      syncFlexibleTaskWithGoogleCalendar({
        supabase: params.supabase,
        user: params.user,
        task,
      })
    )
  )

  syncResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('Unexpected error syncing TaskIA task batch to Google Calendar:', {
        taskId: params.tasks[index]?.id,
        error: result.reason,
      })
    }
  })
}

function sortDays(days: number[]) {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)
}

function getCommitmentColor(type: CommitmentType) {
  if (type === 'clase') return '#4f46e5'
  if (type === 'actividad') return '#10b981'
  return '#64748b'
}

function parseTimeValue(value: string) {
  const [hours, minutes] = value.split(':').map(Number)

  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

function buildDate(base: Date, time: string) {
  const { hours, minutes } = parseTimeValue(time)
  const next = new Date(base)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function getWeekStart(date: Date) {
  const next = new Date(date)
  const day = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - day)
  next.setHours(0, 0, 0, 0)
  return next
}

function normalizeDayIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
      return parsed
    }

    const normalized = value.trim().toLowerCase()
    const dayMap: Record<string, number> = {
      lun: 0,
      lunes: 0,
      mon: 0,
      monday: 0,
      mar: 1,
      martes: 1,
      tue: 1,
      tuesday: 1,
      mie: 2,
      miércoles: 2,
      miercoles: 2,
      wed: 2,
      wednesday: 2,
      jue: 3,
      jueves: 3,
      thu: 3,
      thursday: 3,
      vie: 4,
      viernes: 4,
      fri: 4,
      friday: 4,
      sab: 5,
      sábado: 5,
      sabado: 5,
      sat: 5,
      saturday: 5,
      dom: 6,
      domingo: 6,
      sun: 6,
      sunday: 6,
    }

    return dayMap[normalized] ?? null
  }

  return null
}

function extractCommitmentType(
  metadataValue: unknown,
  fallbackValue?: unknown
): CommitmentType {
  const metadata = asObject(metadataValue)
  const raw = typeof metadata.ui_type === 'string'
    ? metadata.ui_type
    : typeof fallbackValue === 'string'
    ? fallbackValue
    : ''

  if (raw === 'clase' || raw === 'actividad' || raw === 'otro') {
    return raw
  }

  return 'otro'
}

function toTimeString(dateValue: string) {
  const date = new Date(dateValue)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDayIndexFromDate(dateValue: string) {
  const date = new Date(dateValue)
  return (date.getDay() + 6) % 7
}

function buildCommitmentMetadata(data: FixedCommitmentFormData, groupId: string) {
  return {
    source: 'fixed_commitment',
    recurring: true,
    ui_type: data.type,
    days: sortDays(data.days),
    commitment_group_id: groupId,
  }
}

function buildFixedCommitmentRows(
  userId: string,
  data: FixedCommitmentFormData,
  groupId = crypto.randomUUID()
) {
  const days = sortDays(data.days)
  const metadata = buildCommitmentMetadata(data, groupId)

  return days.map((day) => ({
    user_id: userId,
    title: data.title.trim(),
    category: data.type,
    day_of_week: String(day),
    start_time: data.startTime,
    end_time: data.endTime,
    recurrence_rule: 'weekly',
    color: data.color ?? getCommitmentColor(data.type),
    metadata,
  }))
}

function generateScheduledBlocksFromFixedCommitments(
  rows: FixedCommitmentRow[],
  weeks = 6
) {
  const now = new Date()
  const weekStart = getWeekStart(now)
  const blocks = []

  for (const row of rows) {
    const dayIndex = normalizeDayIndex(row.day_of_week)
    const metadata = asObject(row.metadata)
    const type = extractCommitmentType(metadata, row.category)

    if (dayIndex === null || !row.start_time || !row.end_time) {
      continue
    }

    for (let week = 0; week < weeks; week++) {
      const dayBase = new Date(weekStart)
      dayBase.setDate(weekStart.getDate() + week * 7 + dayIndex)

      const start = buildDate(dayBase, row.start_time)
      const end = buildDate(dayBase, row.end_time)

      if (end <= now) {
        continue
      }

      blocks.push({
        user_id: row.user_id,
        title: row.title,
        block_type: 'fixed',
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        color: row.color ?? getCommitmentColor(type),
        is_ai_generated: false,
        is_locked: true,
        fixed_commitment_id: row.id,
        metadata: {
          ...metadata,
          source: metadata.source ?? 'fixed_commitment',
          recurring: true,
          ui_type: type,
          commitment_group_id:
            typeof metadata.commitment_group_id === 'string'
              ? metadata.commitment_group_id
              : `fixed-${row.id}`,
        },
      })
    }
  }

  return blocks
}

function isRecurringCommitmentBlock(block: ScheduledBlockRow) {
  const metadata = asObject(block.metadata)

  return Boolean(
    block.fixed_commitment_id ||
      metadata.recurring === true ||
      metadata.source === 'onboarding' ||
      metadata.source === 'fixed_commitment'
  )
}

function groupFixedCommitmentRows(
  rows: FixedCommitmentRow[],
  blocks: ScheduledBlockRow[]
): FixedCommitmentView[] {
  const grouped = new Map<string, FixedCommitmentView>()
  const fixedIdToGroupId = new Map<string, string>()

  for (const row of rows) {
    const metadata = asObject(row.metadata)
    const groupId =
      typeof metadata.commitment_group_id === 'string'
        ? metadata.commitment_group_id
        : `fixed-${row.id}`
    const type = extractCommitmentType(metadata, row.category)

    const existing = grouped.get(groupId) ?? {
      id: groupId,
      title: row.title,
      type,
      days: [],
      startTime: row.start_time ?? '08:00',
      endTime: row.end_time ?? '09:00',
      color: row.color ?? getCommitmentColor(type),
      fixedCommitmentIds: [],
      blockIds: [],
      createdAt: row.created_at ?? null,
      source: 'fixed_commitment' as const,
    }

    const dayIndex = normalizeDayIndex(row.day_of_week)
    if (dayIndex !== null && !existing.days.includes(dayIndex)) {
      existing.days.push(dayIndex)
    }

    if (!existing.fixedCommitmentIds.includes(row.id)) {
      existing.fixedCommitmentIds.push(row.id)
    }

    fixedIdToGroupId.set(row.id, groupId)
    grouped.set(groupId, existing)
  }

  for (const block of blocks) {
    const metadata = asObject(block.metadata)
    const groupId =
      typeof metadata.commitment_group_id === 'string'
        ? metadata.commitment_group_id
        : block.fixed_commitment_id
        ? fixedIdToGroupId.get(block.fixed_commitment_id)
        : undefined

    if (!groupId) {
      continue
    }

    const commitment = grouped.get(groupId)
    if (commitment && !commitment.blockIds.includes(block.id)) {
      commitment.blockIds.push(block.id)
    }
  }

  return Array.from(grouped.values())
    .map((commitment) => ({
      ...commitment,
      days: sortDays(commitment.days),
    }))
    .sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }

      return a.title.localeCompare(b.title, 'es')
    })
}

function groupLegacyScheduledBlocks(
  blocks: ScheduledBlockRow[]
): FixedCommitmentView[] {
  const grouped = new Map<string, FixedCommitmentView>()

  for (const block of blocks) {
    if (!isRecurringCommitmentBlock(block)) {
      continue
    }

    const metadata = asObject(block.metadata)
    const type = extractCommitmentType(metadata, block.block_type)
    const startTime = toTimeString(block.start_datetime)
    const endTime = toTimeString(block.end_datetime)
    const groupId =
      typeof metadata.commitment_group_id === 'string'
        ? metadata.commitment_group_id
        : `${block.title}::${type}::${startTime}::${endTime}`

    const existing = grouped.get(groupId) ?? {
      id: groupId,
      title: block.title,
      type,
      days: [],
      startTime,
      endTime,
      color: block.color ?? getCommitmentColor(type),
      fixedCommitmentIds: [],
      blockIds: [],
      createdAt: null,
      source: 'legacy_scheduled_block' as const,
    }

    const dayIndex =
      normalizeDayIndex(metadata.day_of_week) ??
      getDayIndexFromDate(block.start_datetime)

    if (!existing.days.includes(dayIndex)) {
      existing.days.push(dayIndex)
    }

    if (!existing.blockIds.includes(block.id)) {
      existing.blockIds.push(block.id)
    }

    grouped.set(groupId, existing)
  }

  return Array.from(grouped.values())
    .map((commitment) => ({
      ...commitment,
      days: sortDays(commitment.days),
    }))
    .sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }

      return a.title.localeCompare(b.title, 'es')
    })
}

async function insertCommitmentRecords(
  supabase: SupabaseServerClient,
  userId: string,
  data: FixedCommitmentFormData
) {
  const fixedRowsPayload = buildFixedCommitmentRows(userId, data)
  const { data: createdRows, error: fixedError } = await supabase
    .from('fixed_commitments')
    .insert(fixedRowsPayload)
    .select('*')

  if (fixedError || !createdRows?.length) {
    return { error: fixedError?.message ?? 'No se pudo crear el compromiso' }
  }

  const scheduledBlocksPayload = generateScheduledBlocksFromFixedCommitments(
    createdRows as FixedCommitmentRow[]
  )

  const { data: createdBlocks, error: blocksError } = await supabase
    .from('scheduled_blocks')
    .insert(scheduledBlocksPayload)
    .select('id, fixed_commitment_id, metadata, user_id, title, start_datetime, end_datetime, block_type, color')

  if (blocksError) {
    await supabase
      .from('fixed_commitments')
      .delete()
      .eq('user_id', userId)
      .in(
        'id',
        (createdRows as FixedCommitmentRow[]).map((row) => row.id)
      )

    return { error: blocksError.message }
  }

  const commitment = groupFixedCommitmentRows(
    createdRows as FixedCommitmentRow[],
    (createdBlocks ?? []) as ScheduledBlockRow[]
  )[0]

  return { data: commitment }
}

async function deleteCommitmentRecords(
  supabase: SupabaseServerClient,
  userId: string,
  params: { fixedCommitmentIds?: string[]; blockIds?: string[] }
) {
  const fixedCommitmentIds = params.fixedCommitmentIds?.filter(Boolean) ?? []
  const blockIds = params.blockIds?.filter(Boolean) ?? []

  if (fixedCommitmentIds.length > 0) {
    const { error: deleteBlocksError } = await supabase
      .from('scheduled_blocks')
      .delete()
      .eq('user_id', userId)
      .in('fixed_commitment_id', fixedCommitmentIds)

    if (deleteBlocksError) {
      return { error: deleteBlocksError.message }
    }

    const { error: deleteCommitmentsError } = await supabase
      .from('fixed_commitments')
      .delete()
      .eq('user_id', userId)
      .in('id', fixedCommitmentIds)

    if (deleteCommitmentsError) {
      return { error: deleteCommitmentsError.message }
    }
  }

  if (blockIds.length > 0) {
    const { error: deleteLegacyBlocksError } = await supabase
      .from('scheduled_blocks')
      .delete()
      .eq('user_id', userId)
      .in('id', blockIds)

    if (deleteLegacyBlocksError) {
      return { error: deleteLegacyBlocksError.message }
    }
  }

  return { success: true }
}


export async function getFlexibleTasks(userId?: string) {
  const supabase = await createClient();
  
  // Si no se proporciona userId, obtener el usuario autenticado
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }
  
  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', targetUserId)
    .order('due_date', { ascending: true })
  if (error) { console.error('Error fetching tasks:', error); return [] }
  return ((data as FlexibleTaskRow[] | null) ?? []).map(normalizeFlexibleTaskRow)
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

  return ((data as ScheduledBlockRow[] | null) ?? []).map((block) => ({
    id: block.id,
    title: block.title,
    start: block.start_datetime,
    end: block.end_datetime,
    backgroundColor: block.color ?? '#6366F1',
    borderColor: block.color ?? '#6366F1',
    editable: false,
    durationEditable: false,
    startEditable: false,
    extendedProps: {
      source: 'scheduled_block',
      blockId: block.id,
      blockType: block.block_type ?? 'fixed',
      fixedCommitmentId: block.fixed_commitment_id ?? null,
      metadata: block.metadata ?? {},
      isLocked: block.is_locked ?? true,
    },
  }))
}

export async function getFixedCommitments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const now = new Date().toISOString()

  const [fixedCommitmentsResult, scheduledBlocksResult] = await Promise.all([
    supabase
      .from('fixed_commitments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('scheduled_blocks')
      .select('*')
      .eq('user_id', user.id)
      .gte('end_datetime', now),
  ])

  if (fixedCommitmentsResult.error) {
    console.error('Error fetching fixed commitments:', fixedCommitmentsResult.error)
  }

  if (scheduledBlocksResult.error) {
    console.error('Error fetching commitment blocks:', scheduledBlocksResult.error)
  }

  const fixedRows = (fixedCommitmentsResult.data ?? []) as FixedCommitmentRow[]
  const scheduledBlocks = (scheduledBlocksResult.data ?? []) as ScheduledBlockRow[]

  const fixedCommitments = groupFixedCommitmentRows(fixedRows, scheduledBlocks)
  const linkedBlockIds = new Set(
    fixedCommitments.flatMap((commitment) => commitment.blockIds)
  )

  const legacyCommitments = groupLegacyScheduledBlocks(
    scheduledBlocks.filter(
      (block) => isRecurringCommitmentBlock(block) && !linkedBlockIds.has(block.id)
    )
  )

  return [...fixedCommitments, ...legacyCommitments].sort((a, b) => {
    if (a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime)
    }

    return a.title.localeCompare(b.title, 'es')
  })
}

export async function createFixedCommitment(data: FixedCommitmentFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (!data.title.trim() || data.days.length === 0) {
    return { error: 'Completa el tÃ­tulo y al menos un dÃ­a' }
  }

  const result = await insertCommitmentRecords(supabase, user.id, data)

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/commitments')

  return { success: true, commitment: result.data }
}

export async function updateFixedCommitment(params: {
  id: string
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
  color?: string
  fixedCommitmentIds?: string[]
  blockIds?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const createResult = await insertCommitmentRecords(supabase, user.id, {
    title: params.title,
    type: params.type,
    days: params.days,
    startTime: params.startTime,
    endTime: params.endTime,
    color: params.color,
  })

  if (createResult.error) {
    return { error: createResult.error }
  }

  const deleteResult = await deleteCommitmentRecords(supabase, user.id, {
    fixedCommitmentIds: params.fixedCommitmentIds,
    blockIds: params.blockIds,
  })

  if (deleteResult.error) {
    await deleteCommitmentRecords(supabase, user.id, {
      fixedCommitmentIds: createResult.data?.fixedCommitmentIds,
      blockIds: createResult.data?.blockIds,
    })

    return { error: deleteResult.error }
  }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/commitments')

  return { success: true, commitment: createResult.data }
}

export async function deleteFixedCommitment(params: {
  id: string
  fixedCommitmentIds?: string[]
  blockIds?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const deleteResult = await deleteCommitmentRecords(supabase, user.id, {
    fixedCommitmentIds: params.fixedCommitmentIds,
    blockIds: params.blockIds,
  })

  if (deleteResult.error) {
    return { error: deleteResult.error }
  }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/commitments')

  return { success: true }
}


export async function getGoogleCalendarEventsInRange(range?: {
  timeMin?: string
  timeMax?: string
}): Promise<GoogleCalendarEventsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { events: [], status: 'disconnected' }
  }

  const googleRange = getNormalizedGoogleCalendarRange(range)

  const googleEventsResponse = await performGoogleCalendarRequest<{
    items?: unknown[]
  }>({
    supabase,
    user,
    execute: (accessToken) =>
      requestGoogleCalendarApi({
        accessToken,
        path:
          `calendars/primary/events?` +
          `timeMin=${encodeURIComponent(googleRange.timeMin)}` +
          `&timeMax=${encodeURIComponent(googleRange.timeMax)}` +
          `&singleEvents=true&orderBy=startTime`,
      }),
  })

  if (googleEventsResponse.status !== 'ok') {
    return {
      events: [],
      status: googleEventsResponse.status,
      ...(googleEventsResponse.error ? { error: googleEventsResponse.error } : {}),
    }
  }

  const events = Array.isArray(googleEventsResponse.data?.items)
    ? googleEventsResponse.data.items
        .map(mapGoogleCalendarEvent)
        .filter((event): event is GoogleCalendarEvent => event !== null)
    : []

  return {
    events,
    status: 'ok',
  }
}


export async function getGoogleCalendarEvents() {
  const result = await getGoogleCalendarEventsInRange()
  return result.events
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
  const name =
    profile?.full_name ||
    profile?.display_name ||
    getGoogleDisplayName(user) ||
    user.email?.split('@')[0] ||
    'Usuario'
  const avatarUrl =
    getStoredGoogleIntegrationState(profile?.preferences).avatarUrl ||
    getGoogleAvatarUrl(user)
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
  return ((data as FlexibleTaskRow[] | null) ?? []).map(normalizeFlexibleTaskRow)
}


export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pendingToday: 0, completedThisWeek: 0, activeGoals: 0, streak: 0 }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
  const [pendingRes, completedRes, goalsRes] = await Promise.all([
    supabase.from('flexible_tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', false).gte('due_date', todayStart.toISOString()),
    supabase.from('flexible_tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true).gte('completed_at', weekStart.toISOString()),
    supabase.from('goals').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'active'),
  ])
  return { pendingToday: pendingRes.count || 0, completedThisWeek: completedRes.count || 0, activeGoals: goalsRes.count || 0, streak: 0 }
}


// ✅ NUEVAS ACCIONES


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
    .update({
      completed: nextTask.completed,
      completed_at: nextTask.completed_at,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)


  if (error) return { error: error.message }
  await syncFlexibleTaskWithGoogleCalendar({
    supabase,
    user,
    task: nextTask,
  })
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
    const dueDateError = validateDueDateNotPast({
      dueDate,
      entityLabel: 'la tarea',
    })
    if (dueDateError) {
      return { error: dueDateError }
    }
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
  await deleteGoogleCalendarTaskEvent({
    supabase,
    user,
    taskId,
  })
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
  return { success: true }
}

export async function updateFlexibleTask(taskId: string, updates: {
  due_date?: string
  estimated_duration_min?: number
}) {
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
    const dueDateError = validateDueDateNotPast({
      dueDate,
      entityLabel: 'la tarea',
    })
    if (dueDateError) {
      return { error: dueDateError }
    }
  }

  const { error } = await supabase
    .from('flexible_tasks')
    .update({
      ...updates,
      due_date: dueDate ?? updates.due_date,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await syncFlexibleTaskWithGoogleCalendar({
    supabase,
    user,
    task: {
      ...(existingTask as FlexibleTaskRow),
      ...updates,
    },
  })

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/tasks')

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
    const dueDateError = validateDueDateNotPast({
      dueDate,
      entityLabel: 'el objetivo',
    })
    if (dueDateError) {
      return { error: dueDateError }
    }
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

  // Obtener el objetivo actual
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (!goal) return { error: 'Objetivo no encontrado' }

  let newPriority: 'low' | 'medium' | 'high'

  if (action === 'auto') {
    // Detección automática basada en fecha de entrega y prioridad actual
    const now = new Date()
    const dueDate = goal.due_date ? new Date(goal.due_date) : null
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Lógica de prioridad automática
    if (daysUntilDue !== null) {
      if (daysUntilDue <= 7) {
        newPriority = 'high' // Menos de 1 semana = alta prioridad
      } else if (daysUntilDue <= 21) {
        newPriority = 'medium' // Menos de 3 semanas = media prioridad
      } else {
        newPriority = 'low' // Más de 3 semanas = baja prioridad
      }
    } else {
      // Sin fecha límite, mantener prioridad media
      newPriority = 'medium'
    }
  } else if (action === 'up') {
    // Subir prioridad
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const currentIndex = priorities.indexOf(goal.priority || 'medium')
    newPriority = priorities[Math.min(currentIndex + 1, 2)]
  } else if (action === 'down') {
    // Bajar prioridad
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const currentIndex = priorities.indexOf(goal.priority || 'medium')
    newPriority = priorities[Math.max(currentIndex - 1, 0)]
  } else {
    // Por defecto, poner en alta
    newPriority = 'high'
  }

  // Actualizar el objetivo con la nueva prioridad
  const { error: updateError } = await supabase
    .from('goals')
    .update({
      priority: newPriority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }
  revalidatePath('/dashboard/goals')
  revalidatePath('/dashboard/calendar')
  
  const priorityLabels = {
    low: 'baja',
    medium: 'media', 
    high: 'alta'
  }
  
  return { 
    success: true, 
    message: `Objetivo "${goal.title}" con prioridad ${priorityLabels[newPriority]} correctamente` 
  }
}

export async function distributeWeeklyTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    // Obtener todas las tareas sin asignar (sin fecha específica)
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('flexible_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('priority', { ascending: false })

    if (tasksError) return { error: tasksError.message }
    const unscheduledTasks = (pendingTasks ?? []).filter(
      (task) =>
        task.due_date === null ||
        task.due_date === undefined ||
        (typeof task.due_date === 'string' && task.due_date.trim() === '')
    )
    if (!unscheduledTasks || unscheduledTasks.length === 0) {
      return { error: 'No hay tareas pendientes sin fecha por repartir' }
    }

    // Obtener los objetivos activos para considerar prioridades
    // Calcular días de la semana (lunes a domingo)
    const today = new Date()
    const currentDay = today.getDay() // 0 = domingo, 1 = lunes, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      weekDays.push(day)
    }

    // Distribución inteligente de tareas
    const distributedTasks = []
    
    // Ordenar tareas por prioridad y duración
    const sortedTasks = unscheduledTasks.sort((a, b) => {
      // Primero por prioridad
      const aPriority = toTaskPriorityLevel(a.priority)
      const bPriority = toTaskPriorityLevel(b.priority)
      
      if (aPriority !== bPriority) return bPriority - aPriority
      
      // Luego por duración (más cortas primero)
      return (a.estimated_duration_min || 30) - (b.estimated_duration_min || 30)
    })

    // Distribuir tareas considerando la carga diaria
    let taskIndex = 0
    for (let dayIndex = 0; dayIndex < weekDays.length && taskIndex < sortedTasks.length; dayIndex++) {
      const currentDay = weekDays[dayIndex]
      let dailyMinutes = 0
      const maxDailyMinutes = 120 // Máximo 2 horas por día

      // Asignar tareas a este día
      while (taskIndex < sortedTasks.length && dailyMinutes < maxDailyMinutes) {
        const task = sortedTasks[taskIndex]
        const taskDuration = task.estimated_duration_min || 30
        
        if (dailyMinutes + taskDuration <= maxDailyMinutes) {
          // Asignar tarea a este día
          const dueDate = new Date(currentDay)
          dueDate.setHours(9 + Math.floor(dailyMinutes / 60), (dailyMinutes % 60), 0, 0)
          
          distributedTasks.push({
            ...task,
            due_date: dueDate.toISOString()
          })
          
          dailyMinutes += taskDuration
          taskIndex++
        } else {
          break
        }
      }
    }

    // Actualizar tareas en la base de datos
    if (distributedTasks.length > 0) {
      const { error: updateError } = await supabase
        .from('flexible_tasks')
        .upsert(distributedTasks, { onConflict: 'id' })

      if (updateError) return { error: updateError.message }

      await syncFlexibleTasksWithGoogleCalendar({
        supabase,
        user,
        tasks: distributedTasks as FlexibleTaskRow[],
      })
    }

    revalidatePath('/dashboard/calendar')
    revalidatePath('/dashboard/tasks')
    
    return { 
      success: true, 
      message: `Se han repartido ${distributedTasks.length} tareas durante esta semana`,
      distributed: distributedTasks.length,
      remaining: unscheduledTasks.length - distributedTasks.length
    }

  } catch (error) {
    console.error('Error distribuyendo tareas semanales:', error)
    return { error: 'Error al distribuir tareas semanales' }
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

export async function prioritizeTask(taskId: string, action?: 'up' | 'down' | 'auto') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener la tarea actual
  const { data: task } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!task) return { error: 'Tarea no encontrada' }

  let newPriority: number

  if (action === 'auto') {
    // Detección automática basada en fecha de entrega y duración
    const now = new Date()
    const dueDate = task.due_date ? new Date(task.due_date) : null
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    const duration = task.estimated_duration_min || 30

    // Lógica de prioridad automática para tareas
    if (daysUntilDue !== null) {
      if (daysUntilDue <= 2) {
        newPriority = 3 // Alta prioridad
      } else if (daysUntilDue <= 7) {
        newPriority = 2 // Media prioridad
      } else {
        newPriority = 1 // Baja prioridad
      }
    } else {
      // Sin fecha límite, basar en duración
      if (duration >= 90) {
        newPriority = 3 // Tareas largas sin fecha = alta prioridad
      } else if (duration >= 60) {
        newPriority = 2 // Tareas medianas = media prioridad
      } else {
        newPriority = 1 // Tareas cortas = baja prioridad
      }
    }
  } else if (action === 'up') {
    // Subir prioridad
    const currentPriority = toTaskPriorityLevel(task.priority)
    newPriority = Math.min(currentPriority + 1, 3)
  } else if (action === 'down') {
    // Bajar prioridad
    const currentPriority = toTaskPriorityLevel(task.priority)
    newPriority = Math.max(currentPriority - 1, 1)
  } else {
    // Por defecto, poner en alta
    newPriority = 3
  }

  // Actualizar la tarea con la nueva prioridad
  const { error: updateError } = await supabase
    .from('flexible_tasks')
    .update({
      priority: newPriority,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
  
  return { 
    success: true, 
    message: `Tarea "${task.title}" con prioridad ${toTaskPriorityLabel(newPriority)} correctamente` 
  }
}

export async function splitTaskWithAI(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener la tarea actual
  const { data: task, error: taskError } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (taskError || !task) return { error: 'Tarea no encontrada' }

  // Obtener compromisos del calendario (eventos existentes)
  const { data: calendarEvents, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', new Date().toISOString())
    .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Próxima semana
    .order('start_time', { ascending: true })

  if (eventsError) {
    console.error('Error obteniendo eventos del calendario:', eventsError)
    // Continuar sin eventos si hay error
  }

  // Construir prompt para la IA
  const taskData = {
    title: task.title,
    description: task.notes || '',
    duration: task.estimated_duration_min || 30,
    difficulty: task.difficulty || 3,
    category: task.category || 'general',
    dueDate: task.due_date || null
  }

  const calendarInfo = calendarEvents ? calendarEvents.map(event => ({
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    type: event.type || 'other'
  })) : []

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

      return {
        error: `El prompt supera el límite interno de ${AI_MAX_INPUT_TOKENS} tokens`,
      }
    }

    const { text, usage } = await generateJson(prompt)
    const parsed = safeParseGoalPlan(text) // Reutilizamos la función de parseo

    if (!parsed.sessions.length) {
      throw new Error('La IA no devolvió sesiones válidas')
    }

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
    // Crear las nuevas tareas a partir de las sesiones
    const newTasks = params.sessions.map(session => ({
      title: session.title,
      category: 'split_task',
      priority: 2, // 2 = media (1=baja, 2=media, 3=alta)
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

    // Marcar la tarea original como completada o archivada
    const { error: updateError } = await supabase
      .from('flexible_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        notes: `[DIVIDIDA] ${params.originalTaskTitle}\nReemplazada por ${createdTasks?.length || 0} tareas más pequeñas.`
      })
      .eq('id', params.originalTaskId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error actualizando tarea original:', updateError)
      // No retornamos error aquí, ya que las nuevas tareas se crearon
    }

    await deleteGoogleCalendarTaskEvent({
      supabase,
      user,
      taskId: params.originalTaskId,
    })

    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/calendar')
    
    return { 
      success: true, 
      created: createdTasks?.length || 0,
      tasks: createdTasks 
    }
  } catch (error: unknown) {
    console.error('createTasksFromSplitTask error:', error)
    return { error: getErrorMessage(error) || 'Error al crear tareas divididas' }
  }
}

export async function getGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching goals:", error)
    return []
  }

  return data
}

// ── AI: GOAL SESSIONS ──────────────────────────────────

// ...
type SuggestedSession = {
  title: string
  durationMin: number
  focus: string
  reason: string
  suggestedTime?: string
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
  const goalData = {
    title: goal.title,
    description: goal.description || '',
    target: goal.target_value || 0,
    current: goal.current_value || 0,
    unit: goal.unit || '',
    due: goal.due_date || null
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

function safeParseGoalPlan(text: string): GoalPlanResult {
  try {
    // Limpiar markdown si existe
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = asObject(JSON.parse(cleanText));

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
      : [];

    return {
      summary: String(parsed.summary ?? '').trim().slice(0, 140),
      sessions,
    };
  } catch (error: unknown) {
    console.error('Error parsing goal plan JSON:', error);
    throw new Error(`La IA devolvió un formato no válido: ${getErrorMessage(error)}`);
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
      model: GROQ_MODEL,
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

// ── AI: SAVE SUGGESTED SESSIONS ───────────────────────

type SessionInput = {
  title: string
  durationMin: number
  focus: string
  reason: string
  suggestedTime?: string
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

  const { data: createdTasks, error } = await supabase
    .from('flexible_tasks')
    .insert(tasksToInsert)
    .select('*')

  if (error) {
    return { error: error.message }
  }

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

