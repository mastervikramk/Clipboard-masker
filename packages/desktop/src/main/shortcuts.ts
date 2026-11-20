/**
 * Global Shortcut Management for Clipboard Masker.
 * Registers global hotkeys:
 * - Alt+V: Summon floating HUD flyout.
 * - Ctrl+Shift+V (CommandOrControl+Shift+V): Paste sanitized/masked text.
 * Standard Ctrl+C (copy) and standard Ctrl+V (paste raw) remain 100% native.
 */
import { globalShortcut, clipboard, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { toggleHUD } from './windows'
import { store } from '../storage/store'
import { clipboardLock } from '../clipboard/lock'
import { fallbackEngine } from '../engine/fallback-engine'

let currentRegisteredHUDKey: string = ''
let currentRegisteredPasteMaskedKey: string = ''
let lastClip = { raw: '', masked: '' }
let isPastingMasked = false

// How long the target app gets to read the masked text before the raw copy is put back.
const RESTORE_DELAY_MS = 400

export function setLastClip(raw: string, masked: string): void {
  lastClip = { raw, masked }
}

/** Late (AI) result for a clip: only applied if that clip is still the latest one. */
export function refineLastClip(raw: string, masked: string): void {
  if (lastClip.raw === raw) {
    lastClip = { raw, masked }
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Masked version of whatever is on the clipboard right now. Uses the cached result
 * when it matches, otherwise masks on the spot (copy not picked up by the poll yet).
 */
function maskedFor(raw: string): string {
  if (raw === lastClip.raw && lastClip.masked) return lastClip.masked
  if (raw === lastClip.masked) return raw
  const entities = fallbackEngine.analyze(raw)
  if (entities.length === 0) return raw
  return fallbackEngine.anonymize(raw, entities, store.getSettings().maskingStrategy)
}

function getKeyHelperPath(): string | null {
  let exe = path.join(__dirname, '../../resources/engine/keyhelper.exe')
  try {
    if (app && app.isPackaged) {
      exe = path.join(process.resourcesPath, 'engine', 'keyhelper.exe')
    }
  } catch {}

  if (fs.existsSync(exe)) {
    return exe
  }
  return null
}

function runKeyHelper(action: 'paste'): Promise<void> {
  return new Promise((resolve) => {
    const exe = getKeyHelperPath()
    if (exe) {
      execFile(exe, [action], { windowsHide: true, timeout: 2000 }, (err) => {
        if (err) {
          console.error(`[KeyHelper] Execution failed for ${action}:`, err)
        }
        resolve()
      })
    } else {
      console.error('[KeyHelper] keyhelper.exe not found at any expected path')
      resolve()
    }
  })
}

/**
 * Triggered on Ctrl+Shift+V:
 * Temporarily puts the masked text on the clipboard, pastes it into the focused app,
 * then restores the original clipboard so Ctrl+V keeps pasting the raw text.
 */
export async function pasteSanitizedClipboard(): Promise<void> {
  // Holding the hotkey fires repeatedly; a second run would snapshot the masked text as "raw".
  if (isPastingMasked) return
  isPastingMasked = true

  try {
    const original = {
      text: clipboard.readText(),
      html: clipboard.readHTML(),
      rtf: clipboard.readRTF()
    }
    if (!original.text || original.text.trim().length === 0) {
      console.warn('[Shortcuts] No text on the clipboard to paste.')
      return
    }

    const masked = maskedFor(original.text)
    if (masked === original.text) {
      await runKeyHelper('paste')
      return
    }

    // writeText is synchronous, so the masked text is on the clipboard before the paste fires
    clipboardLock.acquireInternalWriteLock(masked)
    clipboard.writeText(masked)
    await runKeyHelper('paste')
    await delay(RESTORE_DELAY_MS)

    // Put the raw copy back, unless the user copied something new in the meantime.
    // Not remembered in the hash ring, so copying the same text again later still registers.
    if (clipboard.readText() === masked) {
      clipboardLock.acquireInternalWriteLock(original.text, false)
      clipboard.write({
        text: original.text,
        ...(original.html ? { html: original.html } : {}),
        ...(original.rtf ? { rtf: original.rtf } : {})
      })
    }
  } catch (err) {
    console.error('Failed to paste sanitized clipboard on Ctrl+Shift+V:', err)
  } finally {
    isPastingMasked = false
  }
}

export function registerGlobalShortcuts(): boolean {
  unregisterGlobalShortcuts()

  const settings = store.getSettings()
  const hudKey = settings.hotkey || 'Alt+V'
  const pasteMaskedKey = settings.pasteMaskedHotkey || 'CommandOrControl+Shift+V'

  // Register HUD flyout toggle (Alt+V)
  try {
    if (globalShortcut.register(hudKey, () => toggleHUD())) {
      currentRegisteredHUDKey = hudKey
    }
  } catch {}

  // Fallback HUD toggle registration
  if (!currentRegisteredHUDKey && hudKey !== 'Alt+V') {
    try {
      if (globalShortcut.register('Alt+V', () => toggleHUD())) {
        currentRegisteredHUDKey = 'Alt+V'
      }
    } catch {}
  }

  // Register dedicated Paste Masked hotkey (Ctrl+Shift+V)
  try {
    if (
      globalShortcut.register(pasteMaskedKey, () => {
        pasteSanitizedClipboard()
      })
    ) {
      currentRegisteredPasteMaskedKey = pasteMaskedKey
    }
  } catch (err) {
    console.warn(`[Shortcuts] Failed to register ${pasteMaskedKey}:`, err)
  }

  return !!currentRegisteredHUDKey
}

export function unregisterGlobalShortcuts(): void {
  if (currentRegisteredHUDKey) {
    try {
      globalShortcut.unregister(currentRegisteredHUDKey)
    } catch {}
    currentRegisteredHUDKey = ''
  }
  if (currentRegisteredPasteMaskedKey) {
    try {
      globalShortcut.unregister(currentRegisteredPasteMaskedKey)
    } catch {}
    currentRegisteredPasteMaskedKey = ''
  }
}
