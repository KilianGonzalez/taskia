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
import { generateJson } from '@/lib/ai/groq'

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

export type ParsedTaskIntent = {
  title: string
  date: string | null        // YYYY-MM-DD
  time: string | null        // HH:MM
  durationMin: number | null
  priority: 'alta' | 'media' | 'baja' | null
}

export async function parseNaturalLanguageTask(
  prompt: string
): Promise<{ data: ParsedTaskIntent } | { error: string }> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  // Calcular próximos días de la semana para que la IA los use
  const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const nextDays: Record<string, string> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const dayName = weekdays[d.getDay()]
    if (!nextDays[dayName]) {
      nextDays[dayName] = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
  }

  const aiPrompt = `Extrae los campos de una tarea del siguiente mensaje. Hoy es ${todayStr}.

Próximos días:
${Object.entries(nextDays).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Mensaje: "${prompt.slice(0, 300)}"

Responde SOLO JSON (sin texto extra):
{"title":"nombre de la tarea sin palabras de acción","date":"YYYY-MM-DD o null","time":"HH:MM o null","durationMin":número o null,"priority":"alta|media|baja o null"}

Reglas:
- title: extrae el nombre limpio (sin "crea", "añade", "nuevo", "tarea")
- date: usa los próximos días de arriba si se menciona un día de la semana; null si no hay fecha
- time: hora de inicio en formato HH:MM (24h); null si no se menciona
- durationMin: duración en minutos; null si no se menciona
- priority: "alta" si urgente/importante, "baja" si opcional; "media" si nada; null si no claro`

  try {
    const { text } = await generateJson(aiPrompt)
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const parsed = JSON.parse(match[0]) as ParsedTaskIntent
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error('Título inválido')
    }
    return {
      data: {
        title: parsed.title.trim(),
        date: typeof parsed.date === 'string' && parsed.date.match(/^\d{4}-\d{2}-\d{2}$/) ? parsed.date : null,
        time: typeof parsed.time === 'string' && parsed.time.match(/^\d{2}:\d{2}$/) ? parsed.time : null,
        durationMin: typeof parsed.durationMin === 'number' && parsed.durationMin > 0 ? Math.round(parsed.durationMin) : null,
        priority: ['alta', 'media', 'baja'].includes(parsed.priority as string) ? parsed.priority : null,
      },
    }
  } catch {
    return { error: 'No pude entender el mensaje. Prueba con: "Crea examen historia el jueves a las 10:00 durante 90 min".' }
  }
}
