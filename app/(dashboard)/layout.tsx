import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ← NUEVO: Cargar avatar del perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const avatarUrl = profile?.preferences?.avatar_url || null;

  return (
    <div className="h-screen bg-background flex">
      <aside className="hidden lg:flex lg:w-72 border-r shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ← PASAR AVATAR AL HEADER */}
        <Header avatarUrl={avatarUrl} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
