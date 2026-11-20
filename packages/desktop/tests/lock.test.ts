import { describe, it, expect, beforeEach } from 'vitest'
import { ClipboardLock } from '../src/clipboard/lock'

describe('ClipboardLock Anti-Loop Mutex', () => {
  let lock: ClipboardLock

  beforeEach(() => {
    lock = new ClipboardLock()
  })

  it('identifies internally written text and avoids self-trigger loop', () => {
    const text = 'Sensitive sample text <EMAIL_ADDRESS>'
    expect(lock.isOwnWrite(text)).toBe(false)

    lock.acquireInternalWriteLock(text)
    // First check should report true (and consume internal flag)
    expect(lock.isOwnWrite(text)).toBe(true)

    // Second check should still match via recent hash ring buffer
    expect(lock.isOwnWrite(text)).toBe(true)
  })

  it('rejects external unseen text as not own write', () => {
    lock.acquireInternalWriteLock('Masked snippet A')
    expect(lock.isOwnWrite('External user copied text B')).toBe(false)
  })

  it('evicts oldest hash when ring buffer limit is exceeded', () => {
    for (let i = 0; i < 25; i++) {
      lock.acquireInternalWriteLock(`Snippet #${i}`)
    }
    // Snippet #0 should have been evicted
    expect(lock.isOwnWrite('Snippet #0')).toBe(false)
    // Recent snippet #24 should still be remembered
    expect(lock.isOwnWrite('Snippet #24')).toBe(true)
  })
})
