'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  CommitmentType,
  FixedCommitmentFormData,
  FixedCommitmentRow,
  ScheduledBlockRow,
} from '@/lib/actions/commitments'
import {
  groupFixedCommitmentRows,
  groupLegacyScheduledBlocks,
  isRecurringCommitmentBlock,
  insertCommitmentRecords,
  deleteCommitmentRecords,
} from '@/lib/actions/commitments'
import type { GoogleCalendarEventsResult } from '@/lib/actions/google'
import {
  getNormalizedGoogleCalendarRange,
  mapGoogleCalendarEvent,
  performGoogleCalendarRequest,
  requestGoogleCalendarApi,
} from '@/lib/actions/google'

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

  if (!user) return []

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
  const linkedBlockIds = new Set(fixedCommitments.flatMap((c) => c.blockIds))

  const legacyCommitments = groupLegacyScheduledBlocks(
    scheduledBlocks.filter(
      (block) => isRecurringCommitmentBlock(block) && !linkedBlockIds.has(block.id)
    )
  )

  return [...fixedCommitments, ...legacyCommitments].sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
    return a.title.localeCompare(b.title, 'es')
  })
}

export async function createFixedCommitment(data: FixedCommitmentFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  if (!data.title.trim() || data.days.length === 0) {
    return { error: 'Completa el título y al menos un día' }
  }

  const result = await insertCommitmentRecords(supabase, user.id, data)

  if (result.error) return { error: result.error }

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

  if (!user) return { error: 'No autenticado' }

  const createResult = await insertCommitmentRecords(supabase, user.id, {
    title: params.title,
    type: params.type,
    days: params.days,
    startTime: params.startTime,
    endTime: params.endTime,
    color: params.color,
  })

  if (createResult.error) return { error: createResult.error }

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

  if (!user) return { error: 'No autenticado' }

  const deleteResult = await deleteCommitmentRecords(supabase, user.id, {
    fixedCommitmentIds: params.fixedCommitmentIds,
    blockIds: params.blockIds,
  })

  if (deleteResult.error) return { error: deleteResult.error }

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

  if (!user) return { events: [], status: 'disconnected' }

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
        .filter((event): event is NonNullable<typeof event> => event !== null)
    : []

  return { events, status: 'ok' }
}

export async function getGoogleCalendarEvents() {
  const result = await getGoogleCalendarEventsInRange()
  return result.events
}
