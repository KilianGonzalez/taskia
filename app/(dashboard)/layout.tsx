import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { redirect } from 'next/navigation'
import {
  getGoogleAvatarUrl,
  getGoogleDisplayName,
  getStoredGoogleIntegrationState,
  mergeGoogleIntegrationPreferences,
} from '@/lib/google/integration'

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

  const googleAvatarUrl = getGoogleAvatarUrl(user)
  const googleDisplayName = getGoogleDisplayName(user)
  const mergedPreferences = mergeGoogleIntegrationPreferences(
    existingProfile?.preferences,
    {
      avatarUrl: googleAvatarUrl,
    }
  )

  const resolvedName =
    existingProfile?.full_name ||
    existingProfile?.display_name ||
    googleDisplayName ||
    user.email?.split('@')[0] ||
    'Usuario'

  const onboardingCompleted = existingProfile?.onboarding_completed ?? false

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name:
        existingProfile?.full_name ||
        googleDisplayName ||
        null,
      display_name:
        existingProfile?.display_name ||
        googleDisplayName ||
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

  const avatarUrl = getStoredGoogleIntegrationState(mergedPreferences).avatarUrl

  return (
    <SidebarProvider>
      <DashboardShell avatarUrl={avatarUrl} userName={resolvedName}>
        {children}
      </DashboardShell>
    </SidebarProvider>
  )
}
