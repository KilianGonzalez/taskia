'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getGoogleAvatarUrl,
  getGoogleDisplayName,
  getStoredGoogleIntegrationState,
} from '@/lib/google/integration'

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
