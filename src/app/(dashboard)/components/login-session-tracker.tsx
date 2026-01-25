'use client'

import { useEffect } from 'react'
import { parseUserAgent } from '@/lib/utils/user-agent-parser'
import { getCurrentPosition, reverseGeocode } from '@/lib/utils/reverse-geocoding'

const SESSION_TRACKED_KEY = 'login_session_tracked'

/**
 * Component that tracks login sessions
 * Runs once per session to record browser, OS, and location information
 */
export function LoginSessionTracker() {
  useEffect(() => {
    const trackSession = async () => {
      // Check if we already tracked this session
      if (sessionStorage.getItem(SESSION_TRACKED_KEY)) {
        return
      }

      try {
        // Parse user agent
        const userAgent = navigator.userAgent
        const parsed = parseUserAgent(userAgent)

        // Try to get location (will prompt for permission)
        const position = await getCurrentPosition()

        let city: string | null = null
        let country: string | null = null
        let latitude: number | null = null
        let longitude: number | null = null

        if (position) {
          latitude = position.latitude
          longitude = position.longitude

          // Get city and country from coordinates
          const location = await reverseGeocode(latitude, longitude)
          city = location.city
          country = location.country
        }

        // Send to API
        const response = await fetch('/api/login-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            browserName: parsed.browser.name,
            browserVersion: parsed.browser.version,
            osName: parsed.os.name,
            osVersion: parsed.os.version,
            deviceType: parsed.device.type,
            city,
            country,
            latitude,
            longitude,
            userAgent,
          }),
        })

        if (response.ok) {
          // Mark as tracked for this session
          sessionStorage.setItem(SESSION_TRACKED_KEY, 'true')
        }
      } catch (error) {
        console.error('Error tracking login session:', error)
      }
    }

    trackSession()
  }, [])

  // This component doesn't render anything
  return null
}
