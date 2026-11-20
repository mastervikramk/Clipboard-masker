/**
 * Thread-safe clipboard write-lock and hash deduplicator.
 * Prevents recursive WM_CLIPBOARDUPDATE infinite loops when Clipboard Masker
 * writes sanitized text back to the Windows clipboard.
 */
import crypto from 'node:crypto'

export class ClipboardLock {
  private pendingHash: string | null = null
  private internalWriteTimeout: NodeJS.Timeout | null = null
  // Keep the last 20 hashes of self-written masked clipboard content
  private recentHashes: Set<string> = new Set()
  private hashQueue: string[] = []
  private maxHashes: number = 20

  /**
   * Computes SHA-256 hash of clipboard content string.
   */
  public computeHash(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
  }

  /**
   * Marks that the upcoming clipboard mutation is produced internally by Clipboard Masker.
   * With remember = false only the pending write is matched, not later identical copies.
   */
  public acquireInternalWriteLock(text: string, remember: boolean = true): void {
    const hash = this.computeHash(text)
    if (remember) {
      this.addHash(hash)
    }
    this.pendingHash = hash

    // Safety timeout to reset pending write if OS clipboard write fails
    if (this.internalWriteTimeout) {
      clearTimeout(this.internalWriteTimeout)
    }
    this.internalWriteTimeout = setTimeout(() => {
      this.pendingHash = null
      this.internalWriteTimeout = null
    }, 400)
  }

  /**
   * Checks whether the given text is a result of our own write.
   */
  public isOwnWrite(text: string): boolean {
    const hash = this.computeHash(text)

    if (this.pendingHash === hash) {
      this.pendingHash = null
      if (this.internalWriteTimeout) {
        clearTimeout(this.internalWriteTimeout)
        this.internalWriteTimeout = null
      }
      return true
    }

    return this.recentHashes.has(hash)
  }

  private addHash(hash: string): void {
    if (this.hashQueue.length >= this.maxHashes) {
      const oldest = this.hashQueue.shift()
      if (oldest) {
        this.recentHashes.delete(oldest)
      }
    }
    this.hashQueue.push(hash)
    this.recentHashes.add(hash)
  }

  public reset(): void {
    this.pendingHash = null
    this.recentHashes.clear()
    this.hashQueue = []
    if (this.internalWriteTimeout) {
      clearTimeout(this.internalWriteTimeout)
      this.internalWriteTimeout = null
    }
  }
}

export const clipboardLock = new ClipboardLock()
