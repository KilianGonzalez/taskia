import type { SupabaseServerClient } from '@/lib/actions/shared'
import { asObject } from '@/lib/actions/shared'

export type CommitmentType = 'clase' | 'actividad' | 'otro'

export type FixedCommitmentFormData = {
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
  color?: string
}

export type FixedCommitmentRow = {
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

export type ScheduledBlockRow = {
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

export type FixedCommitmentView = {
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

export function sortDays(days: number[]) {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)
}

export function getCommitmentColor(type: CommitmentType) {
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

export function normalizeDayIndex(value: unknown): number | null {
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
      lun: 0, lunes: 0, mon: 0, monday: 0,
      mar: 1, martes: 1, tue: 1, tuesday: 1,
      mie: 2, miércoles: 2, miercoles: 2, wed: 2, wednesday: 2,
      jue: 3, jueves: 3, thu: 3, thursday: 3,
      vie: 4, viernes: 4, fri: 4, friday: 4,
      sab: 5, sábado: 5, sabado: 5, sat: 5, saturday: 5,
      dom: 6, domingo: 6, sun: 6, sunday: 6,
    }
    return dayMap[normalized] ?? null
  }

  return null
}

export function extractCommitmentType(
  metadataValue: unknown,
  fallbackValue?: unknown
): CommitmentType {
  const metadata = asObject(metadataValue)
  const raw =
    typeof metadata.ui_type === 'string'
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

export function buildFixedCommitmentRows(
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

export function generateScheduledBlocksFromFixedCommitments(
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

export function isRecurringCommitmentBlock(block: ScheduledBlockRow) {
  const metadata = asObject(block.metadata)
  return Boolean(
    block.fixed_commitment_id ||
      metadata.recurring === true ||
      metadata.source === 'onboarding' ||
      metadata.source === 'fixed_commitment'
  )
}

export function groupFixedCommitmentRows(
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

    if (!groupId) continue

    const commitment = grouped.get(groupId)
    if (commitment && !commitment.blockIds.includes(block.id)) {
      commitment.blockIds.push(block.id)
    }
  }

  return Array.from(grouped.values())
    .map((commitment) => ({ ...commitment, days: sortDays(commitment.days) }))
    .sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
      return a.title.localeCompare(b.title, 'es')
    })
}

export function groupLegacyScheduledBlocks(blocks: ScheduledBlockRow[]): FixedCommitmentView[] {
  const grouped = new Map<string, FixedCommitmentView>()

  for (const block of blocks) {
    if (!isRecurringCommitmentBlock(block)) continue

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
      normalizeDayIndex(metadata.day_of_week) ?? getDayIndexFromDate(block.start_datetime)

    if (!existing.days.includes(dayIndex)) {
      existing.days.push(dayIndex)
    }

    if (!existing.blockIds.includes(block.id)) {
      existing.blockIds.push(block.id)
    }

    grouped.set(groupId, existing)
  }

  return Array.from(grouped.values())
    .map((commitment) => ({ ...commitment, days: sortDays(commitment.days) }))
    .sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
      return a.title.localeCompare(b.title, 'es')
    })
}

export async function insertCommitmentRecords(
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
      .in('id', (createdRows as FixedCommitmentRow[]).map((row) => row.id))

    return { error: blocksError.message }
  }

  const commitment = groupFixedCommitmentRows(
    createdRows as FixedCommitmentRow[],
    (createdBlocks ?? []) as ScheduledBlockRow[]
  )[0]

  return { data: commitment }
}

export async function deleteCommitmentRecords(
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

    if (deleteBlocksError) return { error: deleteBlocksError.message }

    const { error: deleteCommitmentsError } = await supabase
      .from('fixed_commitments')
      .delete()
      .eq('user_id', userId)
      .in('id', fixedCommitmentIds)

    if (deleteCommitmentsError) return { error: deleteCommitmentsError.message }
  }

  if (blockIds.length > 0) {
    const { error: deleteLegacyBlocksError } = await supabase
      .from('scheduled_blocks')
      .delete()
      .eq('user_id', userId)
      .in('id', blockIds)

    if (deleteLegacyBlocksError) return { error: deleteLegacyBlocksError.message }
  }

  return { success: true }
}
