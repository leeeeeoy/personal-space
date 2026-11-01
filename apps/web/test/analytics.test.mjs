import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSavedConsent,
  loadClarity,
  saveConsent,
  stopClarity,
  subscribeConsent,
} from '../src/analytics.ts'

const key = 'portfolio-analytics-consent-v2'

function withBrowser(run) {
  const originals = Object.fromEntries(
    ['window', 'document', 'localStorage'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  )
  const values = new Map()
  const scripts = []
  const storage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  }
  const browser = Object.assign(new EventTarget(), {
    location: { hostname: 'leeeeeoy.xyz' },
  })
  for (const [name, value] of Object.entries({
    window: browser,
    localStorage: storage,
    document: {
      querySelector: () => scripts[0] ?? null,
      createElement: () => ({ dataset: {} }),
      head: { append: (script) => scripts.push(script) },
    },
  })) {
    Object.defineProperty(globalThis, name, { value, configurable: true })
  }
  try {
    run({ values, scripts, storage, browser })
  } finally {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('saved grants must be revocable; failed denial writes remove stale consent', () => {
  withBrowser(({ values, storage }) => {
    values.set(key, 'granted')
    assert.equal(getSavedConsent(), 'granted')
    storage.setItem = () => {
      throw new Error('quota')
    }
    assert.equal(getSavedConsent(), null)
    saveConsent('denied')
    assert.equal(values.has(key), false)
    storage.getItem = () => {
      throw new Error('storage blocked')
    }
    assert.equal(getSavedConsent(), null)
  })
})

test('Clarity is production only; withdrawal stops tracking and regrant reuses the script', () => {
  withBrowser(({ scripts, browser }) => {
    browser.location.hostname = 'preview-portfolio.leeeeeoy.xyz'
    loadClarity()
    assert.equal(scripts.length, 0)
    browser.location.hostname = 'leeeeeoy.xyz'
    loadClarity()
    assert.equal(scripts.length, 1)
    assert.equal(scripts[0].src, 'https://www.clarity.ms/tag/xti7rw64s1')
    assert.deepEqual(browser.clarity.q, [
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
    ])
    const commands = []
    browser.clarity = (...args) => commands.push(args)
    stopClarity()
    loadClarity()
    assert.deepEqual(commands, [
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }],
      ['stop'],
      ['start'],
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
    ])
    assert.equal(scripts.length, 1)
  })
})

test('storage changes and clearing synchronize consent; unrelated events and unmounted listeners do not', () => {
  withBrowser(({ values, storage, browser }) => {
    const choices = []
    const unsubscribe = subscribeConsent((consent) => choices.push(consent))
    const change = (changedKey, storageArea = storage) => {
      browser.dispatchEvent(
        Object.assign(new Event('storage'), { key: changedKey, storageArea }),
      )
    }
    values.set(key, 'denied')
    change('portfolio-theme')
    change(key, {})
    assert.deepEqual(choices, [])
    change(key)
    values.delete(key)
    change(null)
    values.set(key, 'granted')
    change(key)
    unsubscribe()
    values.set(key, 'denied')
    change(key)
    assert.deepEqual(choices, ['denied', null, 'granted'])
  })
})
