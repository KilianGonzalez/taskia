'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  GROQ_MODEL,
  AI_MAX_INPUT_TOKENS,
  countInputTokens,
  generateJson,
} from '@/lib/ai/groq'

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

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
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

export async function updateFlexibleTask(taskId: string, updates: {
  due_date?: string
  estimated_duration_min?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('flexible_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

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
    const { data: unscheduledTasks, error: tasksError } = await supabase
      .from('flexible_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .is('due_date', null)
      .order('priority', { ascending: false })

    if (tasksError) return { error: tasksError.message }
    if (!unscheduledTasks || unscheduledTasks.length === 0) {
      return { error: 'No hay tareas pendientes por repartir' }
    }

    // Obtener los objetivos activos para considerar prioridades
    const { data: activeGoals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (goalsError) return { error: goalsError.message }

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
    const tasksPerDay = Math.ceil(unscheduledTasks.length / 7)
    
    // Ordenar tareas por prioridad y duración
    const sortedTasks = unscheduledTasks.sort((a, b) => {
      // Primero por prioridad
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1
      
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
    const currentPriority = (task.priority as number) || 2
    newPriority = Math.min(currentPriority + 1, 3)
  } else if (action === 'down') {
    // Bajar prioridad
    const currentPriority = (task.priority as number) || 2
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/calendar')
  
  const priorityLabels: { [key: number]: string } = {
    1: 'baja',
    2: 'media', 
    3: 'alta'
  }
  
  return { 
    success: true, 
    message: `Tarea "${task.title}" con prioridad ${priorityLabels[newPriority]} correctamente` 
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
  } catch (error: any) {
    console.error('splitTaskWithAI error:', error)

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'split_task',
      model: GROQ_MODEL,
      input_tokens_estimated: await countInputTokens(prompt),
      status: 'error',
      error_message: error?.message ?? 'Error desconocido',
      request_payload: { taskId },
    })

    return { error: error?.message ?? 'No se pudo dividir la tarea' }
  }
}

export async function createTasksFromSplitTask(params: {
  originalTaskId: string
  originalTaskTitle: string
  sessions: any[]
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

    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/calendar')
    
    return { 
      success: true, 
      created: createdTasks?.length || 0,
      tasks: createdTasks 
    }
  } catch (error: any) {
    console.error('createTasksFromSplitTask error:', error)
    return { error: error?.message ?? 'Error al crear tareas divididas' }
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

    const parsed = JSON.parse(cleanText);

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
      : [];

    return {
      summary: String(parsed.summary ?? '').trim().slice(0, 140),
      sessions,
    };
  } catch (error: any) {
    console.error('Error parsing goal plan JSON:', error);
    throw new Error(`La IA devolvió un formato no válido: ${error.message}`);
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
  } catch (error: any) {
    console.error('suggestGoalSessions error:', error)

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      action: 'suggest_goal_sessions',
      model: GROQ_MODEL,
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
    priority: 'media',
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
