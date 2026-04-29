export type TaskPriorityLevel = 1 | 2 | 3
export type TaskPriorityLabel = 'baja' | 'media' | 'alta'
export type TaskPriorityEnglish = 'low' | 'medium' | 'high'
export type TaskPriorityValue =
  | TaskPriorityLevel
  | TaskPriorityLabel
  | TaskPriorityEnglish
  | 'urgent'
  | `${TaskPriorityLevel}`
  | string
  | number
  | null
  | undefined

const PRIORITY_LEVEL_BY_VALUE: Record<string, TaskPriorityLevel> = {
  '1': 1,
  low: 1,
  baja: 1,
  '2': 2,
  medium: 2,
  media: 2,
  '3': 3,
  high: 3,
  alta: 3,
  urgent: 3,
}

const PRIORITY_LABEL_BY_LEVEL: Record<TaskPriorityLevel, TaskPriorityLabel> = {
  1: 'baja',
  2: 'media',
  3: 'alta',
}

const PRIORITY_ENGLISH_BY_LEVEL: Record<TaskPriorityLevel, TaskPriorityEnglish> = {
  1: 'low',
  2: 'medium',
  3: 'high',
}

export function toTaskPriorityLevel(
  value: TaskPriorityValue,
  fallback: TaskPriorityLevel = 2
): TaskPriorityLevel {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1) return 1
    if (value >= 3) return 3
    return 2
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase()
    return PRIORITY_LEVEL_BY_VALUE[normalizedValue] ?? fallback
  }

  return fallback
}

export function toTaskPriorityLabel(
  value: TaskPriorityValue,
  fallback: TaskPriorityLabel = 'media'
): TaskPriorityLabel {
  return PRIORITY_LABEL_BY_LEVEL[toTaskPriorityLevel(value, toTaskPriorityLevel(fallback))]
}

export function toTaskPriorityEnglish(
  value: TaskPriorityValue,
  fallback: TaskPriorityEnglish = 'medium'
): TaskPriorityEnglish {
  return PRIORITY_ENGLISH_BY_LEVEL[
    toTaskPriorityLevel(value, toTaskPriorityLevel(fallback))
  ]
}

export function isHighTaskPriority(value: TaskPriorityValue) {
  return toTaskPriorityLevel(value) === 3
}
