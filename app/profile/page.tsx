// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileScreen from "@/components/profile/ProfileScreen";

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

  return (
    <ProfileScreen 
      user={{ id: user.id, email: user.email, fullName: user.user_metadata?.full_name }}
      profile={profile} 
    />
  );
}
