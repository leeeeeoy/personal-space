const CLARITY_PROJECT_ID = 'xti7rw64s1'
const CLARITY_CONSENT_KEY = 'portfolio-analytics-consent-v2'
const PRODUCTION_HOST = 'leeeeeoy.xyz'

export type Consent = 'granted' | 'denied'
type Clarity = ((command: string, options?: Record<string, string>) => void) & {
  q?: unknown[][]
}

declare global {
  interface Window {
    clarity?: Clarity
  }
}

export function loadClarity() {
  if (window.location.hostname !== PRODUCTION_HOST) return
  const existing = document.querySelector('script[data-clarity]')

  window.clarity ??= (...args: unknown[]) => {
    window.clarity!.q ??= []
    window.clarity!.q!.push(args)
  }
  if (existing) window.clarity('start')
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'granted',
  })

  if (existing) return
  const script = document.createElement('script')
  script.async = true
  script.dataset.clarity = CLARITY_PROJECT_ID
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`
  document.head.append(script)
}

export function getSavedConsent(): Consent | null {
  try {
    const consent = localStorage.getItem(CLARITY_CONSENT_KEY)
    // A stored grant must remain revocable before starting analytics.
    if (consent === 'granted') {
      const probeKey = `${CLARITY_CONSENT_KEY}-write-check`
      localStorage.setItem(probeKey, '1')
      localStorage.removeItem(probeKey)
    }
    return consent === 'granted' || consent === 'denied' ? consent : null
  } catch {
    return null
  }
}

export function saveConsent(consent: Consent) {
  try {
    localStorage.setItem(CLARITY_CONSENT_KEY, consent)
  } catch {
    // Remove a stale grant when quota prevents saving a denial.
    try {
      localStorage.removeItem(CLARITY_CONSENT_KEY)
    } catch {
      // The in-memory choice still applies if all storage writes are blocked.
    }
  }
}

export function stopClarity() {
  window.clarity?.('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'denied',
  })
  // ConsentV2 alone still permits cookieless tracking.
  window.clarity?.('stop')
}

export function subscribeConsent(onChange: (consent: Consent | null) => void) {
  const sync = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return
    if (event.key !== null && event.key !== CLARITY_CONSENT_KEY) return
    onChange(getSavedConsent())
  }
  window.addEventListener('storage', sync)
  return () => window.removeEventListener('storage', sync)
}
