/**
 * In-Browser Web Driver for Clipboard Masker.
 * Activates when running in a standard web browser (http://localhost:5173)
 * so users can test all UI features, PII masking, rules, and statistics directly.
 */
import type { ClipboardItem, EngineStatus, AppSettings, DetectionStats, PreloadAPI } from '../../shared/types'
import { fallbackEngine } from '../../engine/fallback-engine'

const INITIAL_ITEMS: ClipboardItem[] = [
  {
    id: 'demo-1',
    originalText: 'Please wire $1,250 to card 4111-1111-1111-1111 and email receipt to dev.sarah@acme.org',
    maskedText: 'Please wire $1,250 to card <CREDIT_CARD> and email receipt to <EMAIL_ADDRESS>',
    detectedEntities: [
      { type: 'CREDIT_CARD', start: 26, end: 45, score: 0.99 },
      { type: 'EMAIL_ADDRESS', start: 69, end: 87, score: 0.98 }
    ],
    hasPII: true,
    format: 'text',
    timestamp: Date.now() - 3 * 60 * 1000,
    isPinned: true
  },
  {
    id: 'demo-2',
    originalText: 'Emergency contacts: Dr. Adams at +1 (555) 234-5678 or office line 415-555-0199',
    maskedText: 'Emergency contacts: Dr. Adams at <PHONE_NUMBER> or office line <PHONE_NUMBER>',
    detectedEntities: [
      { type: 'PHONE_NUMBER', start: 33, end: 50, score: 0.95 },
      { type: 'PHONE_NUMBER', start: 66, end: 78, score: 0.95 }
    ],
    hasPII: true,
    format: 'text',
    timestamp: Date.now() - 18 * 60 * 1000,
    isPinned: false
  },
  {
    id: 'demo-3',
    originalText: 'GitHub deployment token: ghp_9876543210fedcba9876543210fedcba9876',
    maskedText: 'GitHub deployment token: <API_KEY>',
    detectedEntities: [
      { type: 'API_KEY', start: 25, end: 65, score: 0.99 }
    ],
    hasPII: true,
    format: 'text',
    timestamp: Date.now() - 42 * 60 * 1000,
    isPinned: false
  },
  {
    id: 'demo-4',
    originalText: 'Meeting scheduled for tomorrow at 10:00 AM in room 4B to review Q4 performance roadmap.',
    maskedText: 'Meeting scheduled for tomorrow at 10:00 AM in room 4B to review Q4 performance roadmap.',
    detectedEntities: [],
    hasPII: false,
    format: 'text',
    timestamp: Date.now() - 95 * 60 * 1000,
    isPinned: false
  }
]

export function setupBrowserDriver(): void {
  if (typeof window === 'undefined') return
  if ((window as any).clipboardMasker) return // Already running in Electron context

  let items = [...INITIAL_ITEMS]
  let settings: AppSettings = {
    hotkey: 'Alt+V',
    maskingStrategy: 'tag',
    enabledEntities: {
      PERSON: true,
      EMAIL_ADDRESS: true,
      PHONE_NUMBER: true,
      CREDIT_CARD: true,
      US_SSN: true,
      API_KEY: true,
      CRYPTO: true,
      IP_ADDRESS: true,
      LOCATION: false,
      ORGANIZATION: false
    },
    retentionHours: 24,
    persistOriginalText: true,
    launchAtStartup: false,
    theme: 'system',
    selectedModel: 'gliner2-pii'
  }

  let stats: DetectionStats = {
    totalClips: 14,
    totalPIIDetected: 9,
    entityCounts: {
      EMAIL_ADDRESS: 4,
      CREDIT_CARD: 2,
      PHONE_NUMBER: 2,
      API_KEY: 1
    },
    lastSanitizedTime: Date.now() - 3 * 60 * 1000
  }

  const listeners = {
    clip: new Set<(item: ClipboardItem) => void>(),
    status: new Set<(status: EngineStatus) => void>(),
    stats: new Set<(stats: DetectionStats) => void>()
  }

  const mockApi: PreloadAPI = {
    getHistory: async () => [...items],
    copyItem: async (id: string, useOriginal: boolean) => {
      const item = items.find((i) => i.id === id)
      if (!item) return false
      const textToCopy = useOriginal ? item.originalText : item.maskedText
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy)
      }
      return true
    },
    deleteItem: async (id: string) => {
      items = items.filter((i) => i.id !== id)
      return true
    },
    togglePin: async (id: string) => {
      const item = items.find((i) => i.id === id)
      if (item) {
        item.isPinned = !item.isPinned
        return true
      }
      return false
    },
    clearHistory: async () => {
      items = items.filter((i) => i.isPinned)
      return true
    },
    getEngineStatus: async () => ({
      dockerStatus: 'offline',
      activeEngine: 'fallback_regex',
      isProtectionPaused: false,
      pauseUntil: null,
      modelName: 'urchade/gliner_small-v2.1 (Docker WSL2)',
      supportedEntities: [
        'PERSON',
        'EMAIL_ADDRESS',
        'PHONE_NUMBER',
        'CREDIT_CARD',
        'CRYPTO',
        'IP_ADDRESS',
        'LOCATION',
        'ORGANIZATION',
        'US_SSN',
        'API_KEY'
      ]
    }),
    pauseProtection: async (durationMinutes: number | null) => true,
    resumeProtection: async () => true,
    getSettings: async () => ({ ...settings }),
    saveSettings: async (newSettings: Partial<AppSettings>) => {
      settings = { ...settings, ...newSettings }
      return true
    },
    getStats: async () => ({ ...stats }),
    closeHUD: async () => {
      window.location.hash = '/manager'
    },
    openManager: async () => {
      window.location.hash = '/manager'
    },
    minimizeManager: async () => {},
    closeManager: async () => {
      window.location.hash = '/hud'
    },
    getSystemTheme: async () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    onThemeChanged: (cb) => {
      const m = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => cb(e.matches ? 'dark' : 'light')
      m.addEventListener('change', handler)
      return () => m.removeEventListener('change', handler)
    },
    onClipboardChanged: (cb) => {
      listeners.clip.add(cb)
      return () => listeners.clip.delete(cb)
    },
    onStatusChanged: (cb) => {
      listeners.status.add(cb)
      return () => listeners.status.delete(cb)
    },
    onStatsUpdated: (cb) => {
      listeners.stats.add(cb)
      return () => listeners.stats.delete(cb)
    }
  }

  ;(window as any).clipboardMasker = mockApi

  // Optional: Listen to web paste events to simulate clipboard interception in the browser
  window.addEventListener('paste', (e) => {
    const pastedText = e.clipboardData?.getData('text')
    if (pastedText && pastedText.trim().length > 0) {
      const entities = fallbackEngine.analyze(pastedText, settings.enabledEntities)
      const hasPII = entities.length > 0
      const maskedText = hasPII
        ? fallbackEngine.anonymize(pastedText, entities, settings.maskingStrategy)
        : pastedText

      const newItem: ClipboardItem = {
        id: 'web-' + Math.random().toString(36).substring(2, 9),
        originalText: pastedText,
        maskedText,
        detectedEntities: entities,
        hasPII,
        format: 'text',
        timestamp: Date.now(),
        isPinned: false
      }

      items.unshift(newItem)
      stats.totalClips += 1
      if (hasPII) {
        stats.totalPIIDetected += entities.length
        stats.lastSanitizedTime = Date.now()
        for (const ent of entities) {
          stats.entityCounts[ent.type] = (stats.entityCounts[ent.type] || 0) + 1
        }
      }

      listeners.clip.forEach((cb) => cb(newItem))
      listeners.stats.forEach((cb) => cb({ ...stats }))
    }
  })
}
