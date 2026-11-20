/**
 * Automated retention policy background manager.
 * Regularly purges unpinned clipboard items older than the user-configured retention window.
 */
import { store } from './store'

export class RetentionManager {
  private timer: NodeJS.Timeout | null = null
  private checkIntervalMs: number = 10 * 60 * 1000 // 10 minutes

  public start(): void {
    if (this.timer) return

    // Run once at startup
    this.runPrune()

    // Schedule regular pruning
    this.timer = setInterval(() => {
      this.runPrune()
    }, this.checkIntervalMs)
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public runPrune(): number {
    const settings = store.getSettings()
    return store.pruneExpired(settings.retentionHours)
  }
}

export const retentionManager = new RetentionManager()
