import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('full_name, display_name, preferences, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const mergedPreferences = {
    ...(existingProfile?.preferences ?? {}),
    ...(user.user_metadata?.avatar_url
      ? { avatar_url: user.user_metadata.avatar_url }
      : {}),
    ...(user.user_metadata?.picture
      ? { avatar_url: user.user_metadata.picture }
      : {}),
  }

  const resolvedName =
    existingProfile?.full_name ||
    existingProfile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'

  const onboardingCompleted = existingProfile?.onboarding_completed ?? false

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name:
        existingProfile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        null,
      display_name:
        existingProfile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        null,
      preferences: mergedPreferences,
      onboarding_completed: onboardingCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (!onboardingCompleted) {
    redirect('/onboarding')
  }

  const avatarUrl = mergedPreferences?.avatar_url || null

  return (
    <SidebarProvider>
      <DashboardShell avatarUrl={avatarUrl} userName={resolvedName}>
        {children}
      </DashboardShell>
    </SidebarProvider>
  )
}