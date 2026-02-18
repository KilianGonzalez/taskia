'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// -----------------------------------------------------------------------------
// TAREAS FLEXIBLES (Flexible Tasks)
// -----------------------------------------------------------------------------

export async function getFlexibleTasks() {
  const supabase = await createClient() // AWAIT IMPORTANTE en Next 16
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  return data
}

export async function createFlexibleTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const title = formData.get('title') as string
  const priority = parseInt(formData.get('priority') as string) || 2
  const category = formData.get('category') as string || 'general'

  const { error } = await supabase
    .from('flexible_tasks')
    .insert({
      title,
      priority,
      category,
      user_id: user.id
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard') // Refresca la UI
  return { success: true }
}

// -----------------------------------------------------------------------------
// BLOQUES DE CALENDARIO (Scheduled Blocks)
// -----------------------------------------------------------------------------

export async function getScheduledBlocks(start: string, end: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('scheduled_blocks')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_datetime', start) // Mayor o igual que inicio vista
    .lte('end_datetime', end)     // Menor o igual que fin vista

  if (error) {
    console.error('Error fetching blocks:', error)
    return []
  }

  return data
}