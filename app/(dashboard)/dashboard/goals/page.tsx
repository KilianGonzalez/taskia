import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getGoals } from "@/app/actions";
import { GoalsAiShell } from "@/components/goals/GoalsAiShell";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const goals = await getGoals();

  return <GoalsAiShell initialGoals={goals ?? []} />;
}