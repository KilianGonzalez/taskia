import { createClient } from "@/lib/supabase/server";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const avatarUrl = profile?.preferences?.avatar_url || null;

  return (
    <SidebarProvider>
      <DashboardShell avatarUrl={avatarUrl}>
        {children}
      </DashboardShell>
    </SidebarProvider>
  )
}