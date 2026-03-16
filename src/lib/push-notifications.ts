/**
 * Push notification utility for Hub Central.
 * Sends push notifications directly via Expo Push API.
 *
 * NOTE: This does NOT insert into the notifications table.
 * Hub Central already handles DB inserts in its API routes/webhooks.
 * This only handles the push delivery to user devices.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

/**
 * Send a push notification to all devices registered by a specific user.
 * Queries push_tokens table and calls Expo Push API directly.
 *
 * Fire-and-forget: errors are logged but don't throw.
 */
export async function sendPushToUser(
  profileId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile_id', profileId)

    if (error || !tokens || tokens.length === 0) return

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
      data,
    }))

    // Expo supports batches of 100
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100)
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      })

      if (!response.ok) {
        console.error('[Push] Expo API error:', await response.text())
      }
    }
  } catch (error) {
    console.error('[Push] Error sending push:', error)
  }
}
