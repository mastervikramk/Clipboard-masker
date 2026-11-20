/**
 * Shared Type Definitions for Clipboard Masker.
 * Used across Main, Preload, and Renderer processes.
 */

export type MaskingStrategy = 'tag' | 'redact' | 'asterisk' | 'hash'

export interface PIIEntity {
  type: string
  start: number
  end: number
  score: number
  text?: string
}

export interface ClipboardItem {
  id: string
  originalText: string
  maskedText: string
  detectedEntities: PIIEntity[]
  hasPII: boolean
  format: 'text' | 'html'
  timestamp: number
  isPinned: boolean
}

export interface EngineStatus {
  dockerStatus: 'connected' | 'offline' | 'checking'
  activeEngine: 'gliner' | 'fallback_regex'
  isProtectionPaused: boolean
  pauseUntil?: number | null
  modelName: string
  supportedEntities: string[]
  latencyMs?: number
}

export interface AppSettings {
  hotkey: string
  pasteMaskedHotkey?: string
  maskHotkey?: string
  maskingStrategy: MaskingStrategy
  enabledEntities: Record<string, boolean>
  retentionHours: number
  persistOriginalText: boolean
  launchAtStartup: boolean
  theme: 'system' | 'dark' | 'light'
  selectedModel: string
}

export interface DetectionStats {
  totalClips: number
  totalPIIDetected: number
  entityCounts: Record<string, number>
  lastSanitizedTime?: number
}

export interface PreloadAPI {
  // Clipboard & History
  getHistory: () => Promise<ClipboardItem[]>
  copyItem: (id: string, useOriginal: boolean) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>
  togglePin: (id: string) => Promise<boolean>
  clearHistory: () => Promise<boolean>

  // Protection & Status
  getEngineStatus: () => Promise<EngineStatus>
  pauseProtection: (durationMinutes: number | null) => Promise<boolean>
  resumeProtection: () => Promise<boolean>

  // Settings
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>

  // Stats
  getStats: () => Promise<DetectionStats>

  // Window Controls
  closeHUD: () => Promise<void>
  openManager: () => Promise<void>
  minimizeManager: () => Promise<void>
  closeManager: () => Promise<void>

  // System Theme
  getSystemTheme: () => Promise<'dark' | 'light'>
  onThemeChanged: (callback: (theme: 'dark' | 'light') => void) => () => void

  // Real-time Event Subscriptions
  onClipboardChanged: (callback: (item: ClipboardItem) => void) => () => void
  onStatusChanged: (callback: (status: EngineStatus) => void) => () => void
  onStatsUpdated: (callback: (stats: DetectionStats) => void) => () => void
}
