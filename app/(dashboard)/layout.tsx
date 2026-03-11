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
    .select("name, preferences")
    .eq("id", user.id)
    .single();

  const avatarUrl =
    profile?.preferences?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  // ✅ Nombre desde profiles o desde metadata de Google
  const userName =
    profile?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'

  return (
    <SidebarProvider>
      <DashboardShell avatarUrl={avatarUrl} userName={userName}>
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
