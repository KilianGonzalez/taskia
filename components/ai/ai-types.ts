export type AiCommandIntent =
  | 'generate_week'
  | 'replan_day'
  | 'replan_week'
  | 'split_task'
  | 'move_task'
  | 'protect_rest'
  | 'add_breaks'
  | 'adjust_difficulty'

export type AiTaskInput = {
  id: string
  title: string
  category?: string
  priority?: 'alta' | 'media' | 'baja'
  dueDate?: string
  estimatedDuration?: number
  difficulty?: number
  notes?: string
  completed: boolean
}

export type AiGoalInput = {
  id: string
  title: string
  category: 'academic' | 'personal' | 'habit'
  targetValue: number
  currentValue: number
  dueDate?: string
  status: 'active' | 'completed' | 'paused'
}

export type AiFixedBlockInput = {
  id: string
  title: string
  type: 'class' | 'activity' | 'other'
  days: number[]
  startTime: string
  endTime: string
}

export type AiPreferencesInput = {
  timezone: string
  dayStart: string
  dayEnd: string
  studyDays: number[]
}

export type AiChange = {
  id: string
  type: 'create_block' | 'move_block' | 'split_task' | 'insert_break' | 'defer_task'
  title: string
  description: string
  reason: string
  affectedIds?: string[]
}

export type AiConflict = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export type AiSuggestion = {
  id: string
  title: string
  reason: string
  impact: 'low' | 'medium' | 'high'
  type: 'schedule' | 'task' | 'goal' | 'energy'
  ctaLabel?: string
}

export type AiPlanStats = {
  totalBlocks: number
  overloadDays: number
  focusHours: number
  freeHours: number
}

export type AiPlannerTodaySummary = {
  freeHours: number
  pendingTasks: number
  urgentGoals: number
}