/**
 * Encrypted Local Storage for Clipboard History, Settings, and Stats.
 * Implements AES-256-GCM authenticated encryption at rest.
 * Explicitly prevents raw PII logging to disk or console.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { ClipboardItem, AppSettings, DetectionStats } from '../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Alt+V',
  pasteMaskedHotkey: 'CommandOrControl+Shift+V',
  maskHotkey: 'Alt+C',
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
    LOCATION: true,
    ORGANIZATION: true,
    SALARY: true
  },
  retentionHours: 24,
  persistOriginalText: true,
  launchAtStartup: false,
  theme: 'system',
  selectedModel: 'gliner2-pii'
}

const DEFAULT_STATS: DetectionStats = {
  totalClips: 0,
  totalPIIDetected: 0,
  entityCounts: {}
}

export class EncryptedStore {
  private dataDir: string
  private historyFile: string
  private settingsFile: string
  private statsFile: string
  private secretKey: Buffer
  private itemsInMemory: ClipboardItem[] = []
  private settings: AppSettings
  private stats: DetectionStats

  constructor(customDir?: string) {
    if (customDir) {
      this.dataDir = customDir
    } else {
      // Platform-appropriate user data folder
      const homeDir = process.env.APPDATA || process.env.HOME || '.'
      this.dataDir = path.join(homeDir, '.clipboard-masker')
    }

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }

    this.historyFile = path.join(this.dataDir, 'history.enc')
    this.settingsFile = path.join(this.dataDir, 'settings.json')
    this.statsFile = path.join(this.dataDir, 'stats.json')

    this.secretKey = this.getOrCreateKey()
    this.settings = this.loadSettings()
    this.stats = this.loadStats()
    this.loadHistory()
  }

  /**
   * Generates or retrieves the 256-bit encryption key.
   */
  private getOrCreateKey(): Buffer {
    const keyFile = path.join(this.dataDir, '.master.key')
    if (fs.existsSync(keyFile)) {
      try {
        return fs.readFileSync(keyFile)
      } catch {
        // Fallback to newly generated key
      }
    }
    const key = crypto.randomBytes(32)
    fs.writeFileSync(keyFile, key, { mode: 0o600 })
    return key
  }

  /**
   * AES-256-GCM encryption
   */
  private encrypt(data: string): Buffer {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv)
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    // Payload structure: [12-byte IV][16-byte Auth Tag][Encrypted Data]
    return Buffer.concat([iv, tag, encrypted])
  }

  /**
   * AES-256-GCM decryption
   */
  private decrypt(buffer: Buffer): string | null {
    try {
      if (buffer.length < 28) return null
      const iv = buffer.subarray(0, 12)
      const tag = buffer.subarray(12, 28)
      const encrypted = buffer.subarray(28)

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  }

  private loadSettings(): AppSettings {
    if (fs.existsSync(this.settingsFile)) {
      try {
        const raw = fs.readFileSync(this.settingsFile, 'utf8')
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      } catch {}
    }
    return { ...DEFAULT_SETTINGS }
  }

  public saveSettings(newSettings: Partial<AppSettings>): boolean {
    this.settings = { ...this.settings, ...newSettings }
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf8')
      return true
    } catch {
      return false
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings }
  }

  private loadStats(): DetectionStats {
    if (fs.existsSync(this.statsFile)) {
      try {
        const raw = fs.readFileSync(this.statsFile, 'utf8')
        return { ...DEFAULT_STATS, ...JSON.parse(raw) }
      } catch {}
    }
    return { ...DEFAULT_STATS }
  }

  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2), 'utf8')
    } catch {}
  }

  public getStats(): DetectionStats {
    return { ...this.stats }
  }

  public recordClipStats(item: ClipboardItem): void {
    this.stats.totalClips += 1
    if (item.hasPII) {
      this.stats.totalPIIDetected += item.detectedEntities.length
      this.stats.lastSanitizedTime = item.timestamp
      for (const ent of item.detectedEntities) {
        this.stats.entityCounts[ent.type] = (this.stats.entityCounts[ent.type] || 0) + 1
      }
    }
    this.saveStats()
  }

  private loadHistory(): void {
    if (fs.existsSync(this.historyFile)) {
      try {
        const rawBuffer = fs.readFileSync(this.historyFile)
        const decryptedJson = this.decrypt(rawBuffer)
        if (decryptedJson) {
          this.itemsInMemory = JSON.parse(decryptedJson)
          return
        }
      } catch {}
    }
    this.itemsInMemory = []
  }

  private persistHistory(): void {
    try {
      // If user configured NOT to persist original text to disk, strip it before writing
      const toPersist = this.itemsInMemory.map((item) => {
        if (!this.settings.persistOriginalText) {
          return { ...item, originalText: item.maskedText }
        }
        return item
      })

      const jsonStr = JSON.stringify(toPersist)
      const encryptedBuffer = this.encrypt(jsonStr)
      fs.writeFileSync(this.historyFile, encryptedBuffer)
    } catch {}
  }

  public addItem(item: ClipboardItem): void {
    // Remove identical previous duplicate if present
    this.itemsInMemory = this.itemsInMemory.filter((existing) => existing.maskedText !== item.maskedText)
    // Insert at front
    this.itemsInMemory.unshift(item)
    // Cap at 100 items
    if (this.itemsInMemory.length > 100) {
      this.itemsInMemory = this.itemsInMemory.slice(0, 100)
    }
    this.persistHistory()
    this.recordClipStats(item)
  }

  public updateItem(item: ClipboardItem): void {
    const idx = this.itemsInMemory.findIndex((i) => i.id === item.id)
    if (idx !== -1) {
      this.itemsInMemory[idx] = item
      this.persistHistory()
      this.recordClipStats(item)
    }
  }

  public getItems(): ClipboardItem[] {
    return [...this.itemsInMemory]
  }

  public getItem(id: string): ClipboardItem | undefined {
    return this.itemsInMemory.find((i) => i.id === id)
  }

  public togglePin(id: string): boolean {
    const item = this.itemsInMemory.find((i) => i.id === id)
    if (item) {
      item.isPinned = !item.isPinned
      this.persistHistory()
      return true
    }
    return false
  }

  public deleteItem(id: string): boolean {
    const initialLen = this.itemsInMemory.length
    this.itemsInMemory = this.itemsInMemory.filter((i) => i.id !== id)
    if (this.itemsInMemory.length !== initialLen) {
      this.persistHistory()
      return true
    }
    return false
  }

  public clearHistory(): boolean {
    // Preserve pinned items
    this.itemsInMemory = this.itemsInMemory.filter((i) => i.isPinned)
    this.persistHistory()
    return true
  }

  public pruneExpired(retentionHours: number): number {
    const cutoff = Date.now() - retentionHours * 60 * 60 * 1000
    const initialCount = this.itemsInMemory.length
    this.itemsInMemory = this.itemsInMemory.filter((item) => {
      // Never auto-prune pinned items
      if (item.isPinned) return true
      return item.timestamp >= cutoff
    })
    const prunedCount = initialCount - this.itemsInMemory.length
    if (prunedCount > 0) {
      this.persistHistory()
    }
    return prunedCount
  }
}

export const store = new EncryptedStore()
