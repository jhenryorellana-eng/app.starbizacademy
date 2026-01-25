/**
 * Reverse Geocoding Utility
 * Converts latitude/longitude coordinates to city and country using OpenStreetMap Nominatim API
 */

export interface GeoLocation {
  city: string | null
  country: string | null
  latitude: number
  longitude: number
}

interface NominatimResponse {
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
  }
}

/**
 * Converts coordinates to city and country using OpenStreetMap Nominatim
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Location object with city and country
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ city: string | null; country: string | null }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`,
      {
        headers: {
          'User-Agent': 'StarbizAcademy-HubCentral/1.0',
        },
      }
    )

    if (!response.ok) {
      console.error('Nominatim API error:', response.status)
      return { city: null, country: null }
    }

    const data: NominatimResponse = await response.json()

    if (!data.address) {
      return { city: null, country: null }
    }

    // Try to get the most specific city-level location
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      data.address.county ||
      data.address.state ||
      null

    const country = data.address.country || null

    return { city, country }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return { city: null, country: null }
  }
}

/**
 * Gets the user's current position using the browser's Geolocation API
 * @returns Promise with coordinates or null if unavailable/denied
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.log('Geolocation error:', error.code, error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  })
}
