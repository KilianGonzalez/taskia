'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getFlexibleTasks(userId?: string) {  // ✅ Parámetro opcional
  const supabase = await createClient();
  
  if (!userId) return [];  // ✅ Early return si no hay userId
  
  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', userId); // Asumiendo que tienes RLS o columna user_id

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
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

  if (error) {
    console.error('Error fetching blocks:', error)
    // Retornamos array vacío para no romper la UI si la tabla no existe aún
    return [] 
  }
  return data || []
}

export async function getGoogleCalendarEvents() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Recuperar el token guardado en profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()

  const googleToken = profile?.preferences?.google_calendar_token
  if (!googleToken) return []

  // Calcular rango de fechas (semana actual ± 4 semanas)
  const timeMin = new Date()
  timeMin.setDate(timeMin.getDate() - 28)

  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + 28)

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      console.error('Error Google Calendar API:', res.status)
      return []
    }

    const data = await res.json()

    // Transformar al formato que entiende FullCalendar
    return (data.items || []).map((event: any) => ({
      id: `google_${event.id}`,
      title: event.summary || 'Sin título',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      backgroundColor: '#10b981', // Verde para distinguir eventos de Google
      borderColor: '#059669',
      extendedProps: {
        source: 'google',
        description: event.description,
        location: event.location,
      }
    }))
  } catch (error) {
    console.error('Error fetching Google Calendar:', error)
    return []
  }
}

// Obtener datos del perfil del usuario
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
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'

  const avatarUrl =
    profile?.preferences?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null

  return {
    id: user.id,
    email: profile?.email || user.email,
    name,
    avatarUrl,
  }
}


// Obtener tareas de hoy
export async function getTodayTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

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

// Obtener estadísticas del usuario
export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pendingToday: 0, completedThisWeek: 0, activeGoals: 0, streak: 0 }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const [pendingRes, completedRes, goalsRes] = await Promise.all([
    supabase
      .from('flexible_tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('due_date', todayStart.toISOString()),
    supabase
      .from('flexible_tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('updated_at', weekStart.toISOString()),
    supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ])

  return {
    pendingToday: pendingRes.count || 0,
    completedThisWeek: completedRes.count || 0,
    activeGoals: goalsRes.count || 0,
    streak: 0, // Implementar lógica de racha más adelante
  }
}