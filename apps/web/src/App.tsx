import { ui } from './content'
import { useEffect, useState } from 'react'
import {
  SCROLL_TARGET_KEY,
  SiteFooter,
  SiteHeader,
} from './components/SiteChrome'
import NotesPage from './pages/NotesPage'
import PortfolioPage from './pages/PortfolioPage'
import HomePage from './pages/HomePage'
import RecordListPage from './pages/RecordListPage'
import RecordPage from './pages/RecordPage'
import NotFoundPage from './pages/NotFoundPage'
import { getPage, portfolioSections } from './routes'
import { loadVisitStats } from './visits'

import {
  getSavedConsent,
  loadClarity,
  saveConsent,
  stopClarity,
  subscribeConsent,
  type Consent,
} from './analytics'

const THEME_KEY = 'portfolio-theme'
type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
}

export default function App() {
  const [consent, setConsent] = useState<Consent | null>(getSavedConsent)
  const [showConsent, setShowConsent] = useState(consent === null)
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const [, , noteSlug] = window.location.pathname.split('/')
  const page = getPage(window.location.pathname)

  useEffect(() => {
    if (consent === 'granted') loadClarity()
  }, [consent])

  useEffect(
    () =>
      subscribeConsent((nextConsent) => {
        if (nextConsent !== 'granted') {
          stopClarity()
          void loadVisitStats('denied')
        }
        setConsent(nextConsent)
        setShowConsent(nextConsent === null)
      }),
    [],
  )

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]')
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }),
      { rootMargin: '0px 0px -8%', threshold: 0.12 },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (page !== 'portfolio') return

    let target: string | undefined = portfolioSections.find(
      (section) => window.location.hash === `#${section}`,
    )
    try {
      target = sessionStorage.getItem(SCROLL_TARGET_KEY) ?? target
      sessionStorage.removeItem(SCROLL_TARGET_KEY)
    } catch {
      // Direct section links still work when browser storage is unavailable.
    }
    if (target) {
      const element = document.getElementById(target)
      requestAnimationFrame(() => element?.scrollIntoView())
    }
  }, [page])

  const chooseConsent = (nextConsent: Consent) => {
    saveConsent(nextConsent)
    if (nextConsent === 'denied') stopClarity()

    setConsent(nextConsent)
    setShowConsent(false)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    applyTheme(nextTheme)

    try {
      localStorage.setItem(THEME_KEY, nextTheme)
    } catch {
      // The current-page choice still applies when browser storage is unavailable.
    }

    setTheme(nextTheme)
  }

  return (
    <>
      <button
        className="skip-link"
        type="button"
        onClick={() => document.getElementById('content')?.focus()}
      >
        {ui.skip}
      </button>

      <SiteHeader page={page} theme={theme} onToggleTheme={toggleTheme} />

      <main id="content" tabIndex={-1}>
        {page === 'home' && <HomePage />}
        {page === 'portfolio' && <PortfolioPage />}
        {(page === 'lab' || page === 'writing') &&
          (noteSlug ? (
            <RecordPage kind={page} slug={noteSlug} />
          ) : (
            <RecordListPage kind={page} />
          ))}
        {page === 'notes' && <NotesPage slug={noteSlug} />}
        {page === 'not-found' && <NotFoundPage />}
      </main>

      <SiteFooter
        page={page}
        consent={consent}
        onOpenConsent={() => setShowConsent(true)}
      />

      {showConsent && (
        <aside
          className="consent-banner"
          role="region"
          aria-labelledby="consent-title"
          aria-describedby="consent-description"
        >
          <div>
            <strong id="consent-title">{ui.consentTitle}</strong>
            <p id="consent-description">{ui.consentDescription}</p>
          </div>
          <div className="consent-actions">
            <button type="button" onClick={() => chooseConsent('denied')}>
              {ui.decline}
            </button>
            <button
              className="consent-accept"
              type="button"
              onClick={() => chooseConsent('granted')}
            >
              {ui.allow}
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
