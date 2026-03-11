import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
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

    if (!error && data.session) {
      const user         = data.session.user
      const providerToken = data.session.provider_token

      // Extraer datos del perfil que nos manda Google
      const fullName  = user.user_metadata?.full_name  || user.user_metadata?.name || null
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      const email     = user.email

      // ← AQUÍ VA EL CÓDIGO QUE ME PEDISTE →
      await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: fullName,
            display_name: fullName,
            email: email,
            preferences: {
              avatar_url: avatarUrl,
              ...(providerToken && { google_calendar_token: providerToken }),
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}