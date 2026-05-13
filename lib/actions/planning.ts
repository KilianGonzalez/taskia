import type { ScheduledBlockRow } from './commitments'

export type FreeSlot = {
  date: string
  start: Date
  end: Date
  availableMinutes: number
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function calculateFreeSlots(
  from: Date,
  to: Date,
  blocks: ScheduledBlockRow[],
  options: { workStartHour?: number; workEndHour?: number; minSlotMinutes?: number } = {}
): FreeSlot[] {
  const { workStartHour = 9, workEndHour = 21, minSlotMinutes = 25 } = options
  const slots: FreeSlot[] = []

  const current = new Date(from)
  current.setHours(0, 0, 0, 0)

  const limit = new Date(to)
  limit.setHours(23, 59, 59, 999)

  while (current <= limit) {
    const dayWorkStart = new Date(current)
    dayWorkStart.setHours(workStartHour, 0, 0, 0)

    const dayWorkEnd = new Date(current)
    dayWorkEnd.setHours(workEndHour, 0, 0, 0)

    // Effective start: at least "from" (for today it could be now)
    const effectiveStart = from > dayWorkStart ? new Date(from) : new Date(dayWorkStart)

    if (effectiveStart < dayWorkEnd) {
      const dayBlocks = blocks
        .filter((b) => isSameDay(new Date(b.start_datetime), current))
        .map((b) => ({ start: new Date(b.start_datetime), end: new Date(b.end_datetime) }))
        .sort((a, b) => a.start.getTime() - b.start.getTime())

      let cursor = new Date(effectiveStart)

      for (const block of dayBlocks) {
        if (block.start > cursor) {
          const slotEnd = block.start < dayWorkEnd ? block.start : dayWorkEnd
          const availableMinutes = Math.floor(
            (slotEnd.getTime() - cursor.getTime()) / (1000 * 60)
          )
          if (availableMinutes >= minSlotMinutes) {
            slots.push({
              date: current.toISOString().split('T')[0],
              start: new Date(cursor),
              end: slotEnd,
              availableMinutes,
            })
          }
        }
        if (block.end > cursor) cursor = new Date(block.end)
      }

      // Remaining time after all blocks
      if (cursor < dayWorkEnd) {
        const availableMinutes = Math.floor(
          (dayWorkEnd.getTime() - cursor.getTime()) / (1000 * 60)
        )
        if (availableMinutes >= minSlotMinutes) {
          slots.push({
            date: current.toISOString().split('T')[0],
            start: new Date(cursor),
            end: dayWorkEnd,
            availableMinutes,
          })
        }
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return slots
}

export function assignTasksToSlots<T extends { estimated_duration_min?: number | null }>(
  tasks: T[],
  slots: FreeSlot[],
  breakMinutes = 15
): Array<{ task: T; startTime: Date }> {
  const assignments: Array<{ task: T; startTime: Date }> = []

  let slotIndex = 0
  let cursor: Date | null = slots[0] ? new Date(slots[0].start) : null

  for (const task of tasks) {
    if (slotIndex >= slots.length || !cursor) break

    const taskDuration = task.estimated_duration_min || 30

    while (slotIndex < slots.length && cursor) {
      const slot = slots[slotIndex]
      const remaining = Math.floor(
        (slot.end.getTime() - cursor.getTime()) / (1000 * 60)
      )

      if (remaining >= taskDuration) {
        assignments.push({ task, startTime: new Date(cursor) })
        cursor = new Date(cursor.getTime() + (taskDuration + breakMinutes) * 60 * 1000)
        break
      }

      slotIndex++
      cursor = slotIndex < slots.length ? new Date(slots[slotIndex].start) : null
    }
  }

  return assignments
}
