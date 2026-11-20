import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { EncryptedStore } from '../src/storage/store'
import type { ClipboardItem } from '../src/shared/types'

describe('EncryptedStore Persistence & Retention', () => {
  let tempDir: string
  let store: EncryptedStore

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipboard-masker-test-'))
    store = new EncryptedStore(tempDir)
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('stores and retrieves encrypted clipboard items', () => {
    const item: ClipboardItem = {
      id: 'test-1',
      originalText: 'Sensitive raw card 4532015012345678',
      maskedText: 'Sensitive raw card <CREDIT_CARD>',
      detectedEntities: [{ type: 'CREDIT_CARD', start: 19, end: 35, score: 0.95 }],
      hasPII: true,
      format: 'text',
      timestamp: Date.now(),
      isPinned: false
    }

    store.addItem(item)
    const items = store.getItems()
    expect(items.length).toBe(1)
    expect(items[0].maskedText).toBe('Sensitive raw card <CREDIT_CARD>')

    // Verify raw file on disk is encrypted (does not contain plaintext)
    const historyFile = path.join(tempDir, 'history.enc')
    const rawDiskBuffer = fs.readFileSync(historyFile)
    expect(rawDiskBuffer.includes(Buffer.from('Sensitive raw card'))).toBe(false)
  })

  it('prunes expired unpinned items while preserving pinned items', () => {
    const oldTimestamp = Date.now() - 30 * 60 * 60 * 1000 // 30 hours ago

    const expiredItem: ClipboardItem = {
      id: 'expired-1',
      originalText: 'old item',
      maskedText: 'old item',
      detectedEntities: [],
      hasPII: false,
      format: 'text',
      timestamp: oldTimestamp,
      isPinned: false
    }

    const pinnedExpiredItem: ClipboardItem = {
      id: 'pinned-1',
      originalText: 'pinned item',
      maskedText: 'pinned item',
      detectedEntities: [],
      hasPII: false,
      format: 'text',
      timestamp: oldTimestamp,
      isPinned: true
    }

    store.addItem(expiredItem)
    store.addItem(pinnedExpiredItem)

    // Prune items older than 24h
    const prunedCount = store.pruneExpired(24)
    expect(prunedCount).toBe(1)

    const remaining = store.getItems()
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe('pinned-1')
  })
})
