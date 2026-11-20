/**
 * Presidio HTTP Client communicating with the local Docker WSL2 FastAPI service.
 * Automatically monitors service health and manages fallback transitions.
 */
import type { PIIEntity, MaskingStrategy, EngineStatus } from '../shared/types'
import { fallbackEngine } from './fallback-engine'

export class PresidioClient {
  private baseUrl: string = 'http://127.0.0.1:8125'
  private timeoutMs: number = 900
  private status: EngineStatus = {
    dockerStatus: 'checking',
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
  }

  constructor(baseUrl?: string) {
    if (baseUrl) this.baseUrl = baseUrl
  }

  public getStatus(): EngineStatus {
    return { ...this.status }
  }

  public setPaused(paused: boolean, durationMinutes?: number | null): void {
    this.status.isProtectionPaused = paused
    if (paused && durationMinutes) {
      this.status.pauseUntil = Date.now() + durationMinutes * 60 * 1000
    } else {
      this.status.pauseUntil = null
    }
  }

  public isPaused(): boolean {
    if (!this.status.isProtectionPaused) return false
    if (this.status.pauseUntil && Date.now() > this.status.pauseUntil) {
      // Pause expired
      this.status.isProtectionPaused = false
      this.status.pauseUntil = null
      return false
    }
    return true
  }

  /**
   * Probes the Docker service health endpoint.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)

      const response = await fetch(`${this.baseUrl}/healthz`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = (await response.json()) as any
        this.status.dockerStatus = 'connected'
        this.status.activeEngine = data.gliner_loaded ? 'gliner' : 'gliner'
        if (data.supported_entities) {
          this.status.supportedEntities = data.supported_entities
        }
        return true
      }
    } catch {
      // Docker is offline or unreachable
    }

    this.status.dockerStatus = 'offline'
    this.status.activeEngine = 'fallback_regex'
    return false
  }

  /**
   * Analyzes text for PII using Presidio Docker, or falls back to local regex.
   */
  public async analyze(
    text: string,
    enabledEntities?: Record<string, boolean>
  ): Promise<PIIEntity[]> {
    if (this.isPaused()) return []

    // If Docker is connected, attempt remote analysis
    if (this.status.dockerStatus === 'connected') {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

        const response = await fetch(`${this.baseUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language: 'en'
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = (await response.json()) as any
          let entities: PIIEntity[] = data.entities.map((e: any) => ({
            type: e.entity_type,
            start: e.start,
            end: e.end,
            score: e.score,
            text: e.text || text.substring(e.start, e.end)
          }))

          if (enabledEntities) {
            entities = entities.filter(
              (ent) => enabledEntities[ent.type] !== false
            )
          }

          return entities
        }
      } catch {
        // Fallback on timeout or connection error
        this.status.dockerStatus = 'offline'
        this.status.activeEngine = 'fallback_regex'
      }
    }

    // High-speed local regex fallback
    return fallbackEngine.analyze(text, enabledEntities)
  }

  /**
   * Sanitizes text using Presidio Docker, or falls back to local anonymizer.
   */
  public async anonymize(
    text: string,
    entities: PIIEntity[],
    strategy: MaskingStrategy = 'tag'
  ): Promise<string> {
    if (entities.length === 0) return text
    if (this.isPaused()) return text

    if (this.status.dockerStatus === 'connected') {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

        const response = await fetch(`${this.baseUrl}/anonymize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            strategy,
            entities: entities.map((e) => ({
              entity_type: e.type,
              start: e.start,
              end: e.end,
              score: e.score
            }))
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = (await response.json()) as any
          return data.text
        }
      } catch {
        // Fallback on timeout or error
      }
    }

    return fallbackEngine.anonymize(text, entities, strategy)
  }
}

export const presidioClient = new PresidioClient()
