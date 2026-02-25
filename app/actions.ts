'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getFlexibleTasks() {
  const supabase = await createClient()
  
  // Verificamos auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return [] // O redirect('/login')

  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id) // Asumiendo que tienes RLS o columna user_id

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