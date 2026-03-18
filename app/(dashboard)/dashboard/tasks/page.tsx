import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TasksClient } from "./tasks-client"

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tasks } = await supabase
    .from('flexible_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  return <TasksClient initialTasks={tasks || []} />
}