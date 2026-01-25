/**
 * Native User Agent Parser
 * Parses browser, OS, and device type from user agent string without external dependencies
 */

export interface ParsedUserAgent {
  browser: {
    name: string
    version: string
  }
  os: {
    name: string
    version: string
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet'
  }
}

/**
 * Parses the user agent string to extract browser, OS and device information
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase()

  return {
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: { type: detectDeviceType(ua) },
  }
}

function detectBrowser(ua: string): { name: string; version: string } {
  // Order matters - check more specific browsers first

  // Edge (Chromium-based)
  const edgeMatch = ua.match(/Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/i)
  if (edgeMatch) {
    return { name: 'Microsoft Edge', version: edgeMatch[1] }
  }

  // Opera
  const operaMatch = ua.match(/(?:OPR|Opera)\/(\d+(?:\.\d+)?)/i)
  if (operaMatch) {
    return { name: 'Opera', version: operaMatch[1] }
  }

  // Samsung Browser
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+(?:\.\d+)?)/i)
  if (samsungMatch) {
    return { name: 'Samsung Browser', version: samsungMatch[1] }
  }

  // UC Browser
  const ucMatch = ua.match(/UCBrowser\/(\d+(?:\.\d+)?)/i)
  if (ucMatch) {
    return { name: 'UC Browser', version: ucMatch[1] }
  }

  // Brave (typically identifies as Chrome, but may have Brave in UA)
  if (ua.includes('Brave')) {
    const braveMatch = ua.match(/Brave\/(\d+(?:\.\d+)?)/i)
    if (braveMatch) {
      return { name: 'Brave', version: braveMatch[1] }
    }
  }

  // Chrome
  const chromeMatch = ua.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/i)
  if (chromeMatch && !ua.includes('Edg') && !ua.includes('OPR')) {
    return { name: 'Google Chrome', version: chromeMatch[1] }
  }

  // Firefox
  const firefoxMatch = ua.match(/(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/i)
  if (firefoxMatch) {
    return { name: 'Mozilla Firefox', version: firefoxMatch[1] }
  }

  // Safari (check after Chrome because Chrome also contains Safari in UA)
  const safariMatch = ua.match(/Version\/(\d+(?:\.\d+)?).*Safari/i)
  if (safariMatch) {
    return { name: 'Safari', version: safariMatch[1] }
  }

  // Internet Explorer
  const ieMatch = ua.match(/(?:MSIE |Trident.*rv:)(\d+(?:\.\d+)?)/i)
  if (ieMatch) {
    return { name: 'Internet Explorer', version: ieMatch[1] }
  }

  return { name: 'Navegador desconocido', version: '' }
}

function detectOS(ua: string): { name: string; version: string } {
  // iOS
  const iosMatch = ua.match(/(?:iPhone|iPad|iPod).*OS (\d+[_\.]\d+)/i)
  if (iosMatch) {
    return { name: 'iOS', version: iosMatch[1].replace('_', '.') }
  }

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+[_\.]\d+(?:[_\.]\d+)?)/i)
  if (macMatch) {
    const version = macMatch[1].replace(/_/g, '.')
    return { name: 'macOS', version }
  }

  // Android
  const androidMatch = ua.match(/Android (\d+(?:\.\d+)?)/i)
  if (androidMatch) {
    return { name: 'Android', version: androidMatch[1] }
  }

  // Windows
  const windowsMatch = ua.match(/Windows NT (\d+\.\d+)/i)
  if (windowsMatch) {
    const ntVersion = windowsMatch[1]
    const windowsVersion = mapWindowsNTVersion(ntVersion)
    return { name: 'Windows', version: windowsVersion }
  }

  // Linux
  if (ua.includes('Linux')) {
    return { name: 'Linux', version: '' }
  }

  // Chrome OS
  if (ua.includes('CrOS')) {
    const crosMatch = ua.match(/CrOS \w+ (\d+(?:\.\d+)?)/i)
    return { name: 'Chrome OS', version: crosMatch?.[1] || '' }
  }

  return { name: 'Sistema desconocido', version: '' }
}

function mapWindowsNTVersion(ntVersion: string): string {
  const versionMap: Record<string, string> = {
    '10.0': '10/11',
    '6.3': '8.1',
    '6.2': '8',
    '6.1': '7',
    '6.0': 'Vista',
    '5.2': 'XP x64',
    '5.1': 'XP',
  }
  return versionMap[ntVersion] || ntVersion
}

function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  // Tablet detection
  if (
    ua.includes('ipad') ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    ua.includes('tablet')
  ) {
    return 'tablet'
  }

  // Mobile detection
  if (
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    (ua.includes('android') && ua.includes('mobile')) ||
    ua.includes('windows phone') ||
    ua.includes('blackberry') ||
    ua.includes('mobile')
  ) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * Gets the device icon name based on device type
 */
export function getDeviceIcon(deviceType: 'desktop' | 'mobile' | 'tablet'): string {
  const icons: Record<string, string> = {
    desktop: 'computer',
    mobile: 'smartphone',
    tablet: 'tablet',
  }
  return icons[deviceType] || 'devices'
}
