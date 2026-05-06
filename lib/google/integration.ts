import type { User } from '@supabase/supabase-js'

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as JsonObject
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function getGoogleIdentityData(user: Pick<User, 'identities'> | null | undefined) {
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === 'google'
  )

  return asObject(googleIdentity?.identity_data)
}

export function getGoogleAvatarUrl(
  user: Pick<User, 'user_metadata' | 'identities'> | null | undefined
) {
  const userMetadata = asObject(user?.user_metadata)
  const identityData = getGoogleIdentityData(user)

  return (
    asNonEmptyString(userMetadata.avatar_url) ??
    asNonEmptyString(userMetadata.picture) ??
    asNonEmptyString(identityData.avatar_url) ??
    asNonEmptyString(identityData.picture) ??
    null
  )
}

export function getGoogleDisplayName(
  user: Pick<User, 'user_metadata' | 'identities'> | null | undefined
) {
  const userMetadata = asObject(user?.user_metadata)
  const identityData = getGoogleIdentityData(user)

  return (
    asNonEmptyString(userMetadata.full_name) ??
    asNonEmptyString(userMetadata.name) ??
    asNonEmptyString(identityData.full_name) ??
    asNonEmptyString(identityData.name) ??
    null
  )
}

export function getStoredGoogleIntegrationState(preferences: unknown) {
  const parsedPreferences = asObject(preferences)

  return {
    avatarUrl: asNonEmptyString(parsedPreferences.avatar_url),
    accessToken: asNonEmptyString(parsedPreferences.google_calendar_token),
    refreshToken: asNonEmptyString(
      parsedPreferences.google_calendar_refresh_token
    ),
    accessTokenExpiresAt: asNonEmptyString(
      parsedPreferences.google_calendar_token_expires_at
    ),
    lastSyncError: asNonEmptyString(
      parsedPreferences.google_calendar_last_sync_error
    ),
  }
}

export function mergeGoogleIntegrationPreferences(
  preferences: unknown,
  updates: {
    avatarUrl?: string | null
    accessToken?: string | null
    refreshToken?: string | null
    accessTokenExpiresAt?: string | null
    lastSyncError?: string | null
  }
) {
  const mergedPreferences: JsonObject = {
    ...asObject(preferences),
  }

  if (typeof updates.avatarUrl === 'string' && updates.avatarUrl.length > 0) {
    mergedPreferences.avatar_url = updates.avatarUrl
  }

  if (
    typeof updates.accessToken === 'string' &&
    updates.accessToken.length > 0
  ) {
    mergedPreferences.google_calendar_token = updates.accessToken
  }

  if (
    typeof updates.refreshToken === 'string' &&
    updates.refreshToken.length > 0
  ) {
    mergedPreferences.google_calendar_refresh_token = updates.refreshToken
  }

  if (updates.accessTokenExpiresAt === null) {
    delete mergedPreferences.google_calendar_token_expires_at
  } else if (
    typeof updates.accessTokenExpiresAt === 'string' &&
    updates.accessTokenExpiresAt.length > 0
  ) {
    mergedPreferences.google_calendar_token_expires_at =
      updates.accessTokenExpiresAt
  }

  if (updates.lastSyncError === null) {
    delete mergedPreferences.google_calendar_last_sync_error
  } else if (
    typeof updates.lastSyncError === 'string' &&
    updates.lastSyncError.length > 0
  ) {
    mergedPreferences.google_calendar_last_sync_error = updates.lastSyncError
  }

  return mergedPreferences
}

export function shouldRefreshGoogleAccessToken(
  accessTokenExpiresAt: string | null,
  bufferSeconds = 120
) {
  if (!accessTokenExpiresAt) {
    return false
  }

  const expiresAt = Date.parse(accessTokenExpiresAt)

  if (Number.isNaN(expiresAt)) {
    return false
  }

  return expiresAt - Date.now() <= bufferSeconds * 1000
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
    )
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: unknown
        refresh_token?: unknown
        expires_in?: unknown
        error?: unknown
        error_description?: unknown
      }
    | null

  if (!response.ok) {
    const refreshError =
      asNonEmptyString(payload?.error_description) ??
      asNonEmptyString(payload?.error) ??
      `Google token refresh failed with status ${response.status}`

    throw new Error(refreshError)
  }

  const accessToken = asNonEmptyString(payload?.access_token)

  if (!accessToken) {
    throw new Error('Google token refresh response did not include access_token')
  }

  const refreshTokenFromResponse = asNonEmptyString(payload?.refresh_token)
  const expiresInSeconds =
    typeof payload?.expires_in === 'number' ? payload.expires_in : null
  const accessTokenExpiresAt =
    typeof expiresInSeconds === 'number'
      ? new Date(Date.now() + Math.max(expiresInSeconds - 60, 0) * 1000).toISOString()
      : null

  return {
    accessToken,
    refreshToken: refreshTokenFromResponse,
    accessTokenExpiresAt,
  }
}
