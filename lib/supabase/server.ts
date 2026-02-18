import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Exportamos la función con el nombre genérico 'createClient'
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
            // El bloque try/catch maneja casos donde las cookies se intentan setear
            // en un componente de servidor que ya ha empezado a renderizar
          }
        },
      },
    }
  )
}