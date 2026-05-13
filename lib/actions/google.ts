import type { User } from '@supabase/supabase-js'
import type { SupabaseServerClient, FlexibleTaskRow } from '@/lib/actions/shared'
import { asObject, asNonEmptyString } from '@/lib/actions/shared'
import {
  getStoredGoogleIntegrationState,
  mergeGoogleIntegrationPreferences,
  refreshGoogleAccessToken,
  shouldRefreshGoogleAccessToken,
  getGoogleAvatarUrl,
} from '@/lib/google/integration'
import { toTaskPriorityLabel } from '@/lib/tasks/priority'

export type GoogleCalendarEvent = {
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

export type GoogleCalendarEventsResult = {
  events: GoogleCalendarEvent[]
  status: 'ok' | 'disconnected' | 'error'
  error?: string
}

export type GoogleCalendarApiResponse<T> = {
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

export function getNormalizedGoogleCalendarRange(range?: {
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

export function mapGoogleCalendarEvent(rawEvent: unknown): GoogleCalendarEvent | null {
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

export function getTaskiaGoogleTaskEventId(taskId: string) {
  const normalizedTaskId = taskId.toLowerCase().replace(/[^a-v0-9]/g, '')
  return `${TASKIA_GOOGLE_TASK_EVENT_PREFIX}${normalizedTaskId}`
}

export function isTaskiaGoogleTaskEventId(eventId: string | null | undefined) {
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
  if (!dueDate) return null

  const summary = asNonEmptyString(task.title) ?? 'Sin titulo'
  const description = buildGoogleCalendarTaskDescription(task)
  const id = getTaskiaGoogleTaskEventId(task.id)

  if (isDateOnlyTaskDueDate(dueDate)) {
    const startDate = dueDate.slice(0, 10)
    return {
      id,
      summary,
      description,
      start: { date: startDate },
      end: { date: addDaysToIsoDate(startDate, 1) },
    }
  }

  const startDate = new Date(dueDate)
  if (Number.isNaN(startDate.getTime())) return null

  const durationMinutes =
    typeof task.estimated_duration_min === 'number' && Number.isFinite(task.estimated_duration_min)
      ? Math.max(Math.round(task.estimated_duration_min), 15)
      : 60

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

  return {
    id,
    summary,
    description,
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
  }
}

export async function requestGoogleCalendarApi<T>(params: {
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

    return { ok: false, status: response.status, data: null, error: errorMessage }
  }

  return { ok: true, status: response.status, data: (parsedPayload as T | null) ?? null, error: null }
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

  if (refreshToken && (!accessToken || shouldRefreshGoogleAccessToken(accessTokenExpiresAt))) {
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

export async function performGoogleCalendarRequest<T>(params: {
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

  if (!accessToken) return { status: 'disconnected' }

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
        updates: { lastSyncError, accessTokenExpiresAt },
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
        updates: { lastSyncError: null, accessTokenExpiresAt },
      })
    }

    return { status: 'ok', httpStatus: response.status, data: response.data }
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

    return { status: 'error', error: 'Unexpected Google Calendar sync error' }
  }
}

export async function deleteGoogleCalendarTaskEvent(params: {
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

export async function upsertGoogleCalendarTaskEvent(params: {
  supabase: SupabaseServerClient
  user: User
  task: FlexibleTaskRow
}) {
  const eventPayload = buildGoogleCalendarTaskEventPayload(params.task)
  if (!eventPayload) return { status: 'ok' as const }

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

  if (updateResult.httpStatus !== 404) return updateResult

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

export async function syncFlexibleTaskWithGoogleCalendar(params: {
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

export async function syncFlexibleTasksWithGoogleCalendar(params: {
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
