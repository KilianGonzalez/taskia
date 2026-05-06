// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileScreen from "@/components/profile/ProfileScreen";

function toDateKey(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function addDays(dateKey: string, deltaDays: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function computeCurrentStreak(completedAtValues: Array<string | null>, timeZone: string) {
  const completionDays = new Set(
    completedAtValues
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => toDateKey(value, timeZone))
  );

  if (completionDays.size === 0) return 0;

  const todayKey = toDateKey(new Date().toISOString(), timeZone);
  const yesterdayKey = addDays(todayKey, -1);

  let cursor = completionDays.has(todayKey) ? todayKey : yesterdayKey;
  if (!completionDays.has(cursor)) {
    return 0;
  }

  let streak = 0;

  while (completionDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user || error) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const [completedTasksResult, completedGoalsResult, completedDatesResult] = await Promise.all([
    supabase
      .from("flexible_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("flexible_tasks")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .not("completed_at", "is", null),
  ]);

  const timezone = profile?.timezone || "Europe/Madrid";
  const completedAtValues = ((completedDatesResult.data ?? []) as Array<{ completed_at?: string | null }>).map(
    (row) => row.completed_at ?? null
  );

  const stats = {
    completedTasks: completedTasksResult.count ?? 0,
    currentStreak: computeCurrentStreak(completedAtValues, timezone),
    achievedGoals: completedGoalsResult.count ?? 0,
  };

  return (
    <ProfileScreen 
      user={{
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name,
        avatarUrl:
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          null,
      }}
      profile={profile}
      stats={stats}
    />
  );
}
