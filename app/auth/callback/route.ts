import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  getGoogleAvatarUrl,
  getGoogleDisplayName,
  mergeGoogleIntegrationPreferences,
} from '@/lib/google/integration'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
  }

  const user = data.session.user
  const providerToken = data.session.provider_token
  const providerRefreshToken = data.session.provider_refresh_token

  const fullName = getGoogleDisplayName(user)
  const avatarUrl = getGoogleAvatarUrl(user)
  const email = user.email ?? null

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('full_name, display_name, preferences, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const mergedPreferences = mergeGoogleIntegrationPreferences(
    existingProfile?.preferences,
    {
      avatarUrl,
      accessToken: providerToken,
      refreshToken: providerRefreshToken,
      lastSyncError: null,
    }
  )

  const onboardingCompleted = existingProfile?.onboarding_completed ?? false

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      full_name: existingProfile?.full_name || fullName,
      display_name: existingProfile?.display_name || fullName,
      email,
      preferences: mergedPreferences,
      onboarding_completed: onboardingCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  const destination = onboardingCompleted ? safeNext : '/onboarding'

  return NextResponse.redirect(`${origin}${destination}`)
}
