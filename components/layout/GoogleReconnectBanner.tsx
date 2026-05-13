'use client'

import { useState } from 'react'
import { AlertTriangle, X, RefreshCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function GoogleReconnectBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (dismissed) return null

  const handleReconnect = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/60 dark:bg-amber-950/40">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        Tu sesión de Google Calendar ha caducado. Reconecta para seguir sincronizando tus eventos.
      </p>
      <button
        type="button"
        onClick={() => void handleReconnect()}
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        <RefreshCcw className="h-3 w-3" />
        {loading ? 'Redirigiendo…' : 'Reconectar'}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 transition-colors hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-300"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
