import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFlexibleTasks } from "@/app/actions";
import { TasksAiShell } from "@/components/tasks/TasksAiShell";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tasks = await getFlexibleTasks();

  return (
    <TasksAiShell
      initialTasks={tasks ?? []}
    />
  );
}