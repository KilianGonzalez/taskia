import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Si está en rutas de auth, dejar pasar
  if (pathname.startsWith('/auth') || pathname.startsWith('/(auth)')) {
    return NextResponse.next()
  }

  // Si está en la página principal, dejar pasar
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Para rutas protegidas, verificar autenticación
  if (pathname.startsWith('/dashboard')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/(auth)/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
