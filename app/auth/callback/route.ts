import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // si "next" viene en la URL, redirigir ahí, si no, a dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies() // Await en Next 16
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
            } catch {
              // Setear cookies en Server Actions/Route Handlers a veces falla si ya se enviaron headers
            }
          },
        },
      }
    )
    
    // Intercambiar código por sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error -> Redirigir a login
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}