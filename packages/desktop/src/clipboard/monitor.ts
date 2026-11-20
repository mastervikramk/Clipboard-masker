/**
 * Clipboard Monitoring and Sanitization Service.
 * Detects clipboard changes, analyzes for PII, applies masking policies,
 * safely updates history, and provides dual-mode raw / masked pasting.
 */
import { clipboard, Notification } from 'electron'
import crypto from 'node:crypto'
import { clipboardLock } from './lock'
import { glinerEngine } from '../engine/gliner-engine'
import { fallbackEngine } from '../engine/fallback-engine'
import { store } from '../storage/store'
import { setLastClip, refineLastClip } from '../main/shortcuts'
import { getIconPath } from '../main/windows'
import type { ClipboardItem } from '../shared/types'

export type ClipboardCallback = (item: ClipboardItem) => void

export class ClipboardMonitor {
  private pollInterval: NodeJS.Timeout | null = null
  private pollDelayMs: number = 200
  private lastObservedText: string = ''
  private isRunning: boolean = false
  private listeners: Set<ClipboardCallback> = new Set()

  public start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Initialize lastObservedText with whatever is currently in clipboard
    try {
      this.lastObservedText = clipboard.readText() || ''
    } catch {
      this.lastObservedText = ''
    }

    this.pollInterval = setInterval(() => {
      this.checkClipboard()
    }, this.pollDelayMs)
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.isRunning = false
  }

  public addListener(cb: ClipboardCallback): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notifyListeners(item: ClipboardItem): void {
    for (const cb of this.listeners) {
      try {
        cb(item)
      } catch {}
    }
  }

  /**
   * Main check function executed on each poll cycle.
   */
  public async checkClipboard(): Promise<void> {
    let currentText = ''
    try {
      currentText = clipboard.readText() || ''
    } catch {
      return
    }

    // Skip empty or unchanged text
    if (!currentText || currentText === this.lastObservedText) {
      return
    }

    // Check if this text was written by Clipboard Masker itself
    if (clipboardLock.isOwnWrite(currentText)) {
      this.lastObservedText = currentText
      return
    }

    this.lastObservedText = currentText
    await this.processNewClip(currentText)
  }

  /**
   * Processes a newly copied clipboard item using a high-speed two-tier pipeline:
   * Tier 1: Instant in-process engine masks obvious PII within 1ms.
   * Tier 2: Asynchronous bundled GLiNER2-PII engine performs deep entity classification.
   *
   * The raw text always stays on the Windows clipboard so Ctrl+V pastes raw;
   * the masked text is cached in memory so Ctrl+Shift+V pastes masked.
   */
  public async processNewClip(text: string): Promise<ClipboardItem | null> {
    const settings = store.getSettings()

    // Read format (plain text vs HTML)
    let format: 'text' | 'html' = 'text'
    try {
      const html = clipboard.readHTML()
      if (html && html.trim().length > 0) {
        format = 'html'
      }
    } catch {}

    // Tier 1: Instant In-Process Pass (< 1ms)
    const fastEntities = fallbackEngine.analyze(text)
    const fastHasPII = fastEntities.length > 0
    let currentMasked = text

    if (fastHasPII) {
      currentMasked = fallbackEngine.anonymize(text, fastEntities, settings.maskingStrategy)
    }

    // Cache sanitized text in memory for Ctrl+Shift+V paste
    setLastClip(text, currentMasked)

    if (fastHasPII) {
      this.notifyPIIDetected()
    }

    const item: ClipboardItem = {
      id: crypto.randomUUID(),
      originalText: text,
      maskedText: currentMasked,
      detectedEntities: fastEntities,
      hasPII: fastHasPII,
      format,
      timestamp: Date.now(),
      isPinned: false
    }

    // Persist & notify UI immediately so history and HUD update with zero latency
    store.addItem(item)
    this.notifyListeners(item)

    // Tier 2: Asynchronous Local AI Reasoning (GLiNER2-PII)
    if (!glinerEngine.isPaused()) {
      glinerEngine
        .extractEntities(text)
        .then((aiEntities) => {
          if (aiEntities && aiEntities.length > 0) {
            // Combine Tier 1 and Tier 2 entities seamlessly
            const combined = [...fastEntities, ...aiEntities]
            const finalMasked = glinerEngine.applySpans(text, combined, settings.maskingStrategy)

            if (finalMasked && finalMasked !== currentMasked) {
              refineLastClip(text, finalMasked)

              item.maskedText = finalMasked
              item.detectedEntities = combined
              item.hasPII = true
              store.updateItem(item)
              this.notifyListeners(item)

              // Tier 1 found nothing, so the user hasn't been told yet
              if (!fastHasPII) {
                this.notifyPIIDetected()
              }
            }
          }
        })
        .catch(() => {})
    }

    return item
  }

  private notifyPIIDetected(): void {
    if (!Notification.isSupported()) return
    try {
      new Notification({
        title: 'Clipboard Masker',
        body: 'PII detected & masked. Press Ctrl+Shift+V to paste masked, or Ctrl+V for raw.',
        icon: getIconPath() || undefined
      }).show()
    } catch {}
  }

  /**
   * Allows the user to deliberately copy either the masked or original text from the UI.
   */
  public copyItemToClipboard(id: string, useOriginal: boolean): boolean {
    const item = store.getItem(id)
    if (!item) return false

    const textToCopy = useOriginal ? item.originalText : item.maskedText
    clipboardLock.acquireInternalWriteLock(textToCopy)
    try {
      clipboard.writeText(textToCopy)
      this.lastObservedText = textToCopy
      setLastClip(item.originalText, item.maskedText)
      return true
    } catch {
      return false
    }
  }
}

export const clipboardMonitor = new ClipboardMonitor()
