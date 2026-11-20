/**
 * GLiNER2-PII High-Performance Local AI Engine.
 * Spawns and manages the bundled Python GLiNER2 worker process over stdio.
 * Provides sub-second, zero-refusal, span-level named entity extraction
 * with mathematical text integrity and zero hallucination.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import readline from 'node:readline'
import { app } from 'electron'
import type { PIIEntity, MaskingStrategy, EngineStatus } from '../shared/types'

interface PendingRequest {
  resolve: (entities: PIIEntity[]) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

function computeShortHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
  return hex.padStart(8, '0').substring(0, 8)
}

export class GlinerEngine {
  private workerProcess: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private reqSequence: number = 0
  private pendingRequests: Map<number, PendingRequest> = new Map()
  private isModelReady: boolean = false
  private isProtectionPaused: boolean = false
  private pauseUntil: number | null = null
  private lastLatencyMs: number = 0
  private activeModelName: string = 'gliner2-pii'
  private retryCount: number = 0
  private static MAX_RETRIES: number = 2

  constructor() {
    this.initWorker()
  }

  /**
   * Resolves the executable, script, and model paths for the worker.
   */
  private getWorkerPaths(): { workerExe: string | null; pythonPath: string; scriptPath: string; modelPath: string } {
    let workerExe: string | null = path.join(__dirname, '../../resources/engine/worker/gliner_worker.exe')
    let scriptPath = path.join(__dirname, '../../resources/engine/gliner_worker.py')
    let modelPath = path.join(__dirname, '../../resources/models/gliner2-pii')

    try {
      if (app && app.isPackaged) {
        workerExe = path.join(process.resourcesPath, 'engine', 'worker', 'gliner_worker.exe')
        scriptPath = path.join(process.resourcesPath, 'engine', 'gliner_worker.py')
        modelPath = path.join(process.resourcesPath, 'models', 'gliner2-pii')
      }
    } catch {}

    if (workerExe && !fs.existsSync(workerExe)) {
      workerExe = null
    }

    let pythonPath = 'python'
    // Search common Windows Python installation directories as fallback
    if (process.platform === 'win32') {
      const candidates = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python314', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
        'C:\\Python314\\python.exe',
        'C:\\Python313\\python.exe',
        'C:\\Python312\\python.exe',
        'C:\\Python311\\python.exe',
        'C:\\Python310\\python.exe',
        path.join(process.env.ProgramFiles || '', 'Python314', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python313', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python312', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python311', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python310', 'python.exe')
      ]
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          pythonPath = cand
          break
        }
      }
    }

    return { workerExe, pythonPath, scriptPath, modelPath }
  }

  /**
   * Spawns the background GLiNER2 worker (standalone binary or Python script).
   */
  public initWorker(): void {
    if (this.workerProcess) {
      return
    }

    const { workerExe, pythonPath, scriptPath, modelPath } = this.getWorkerPaths()

    try {
      if (workerExe && fs.existsSync(workerExe)) {
        const args: string[] = []
        if (fs.existsSync(modelPath)) {
          args.push(modelPath)
        }
        console.log(`[GlinerEngine] Launching standalone bundled worker: ${workerExe}`)
        console.log(`[GlinerEngine] Worker cwd set to: ${path.dirname(workerExe)}`)
        this.workerProcess = spawn(workerExe, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          cwd: path.dirname(workerExe)
        })
      } else if (fs.existsSync(scriptPath)) {
        const args = ['-u', scriptPath]
        if (fs.existsSync(modelPath)) {
          args.push(modelPath)
        }
        console.log(`[GlinerEngine] Launching Python script fallback worker: ${pythonPath} ${scriptPath}`)
        this.workerProcess = spawn(pythonPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          cwd: path.dirname(scriptPath)
        })
      } else {
        console.warn(`[GlinerEngine] Neither standalone worker nor worker script found.`)
        return
      }

      if (!this.workerProcess.stdout || !this.workerProcess.stdin) {
        console.error('[GlinerEngine] Failed to acquire stdio streams for worker')
        return
      }

      this.rl = readline.createInterface({ input: this.workerProcess.stdout })

      this.rl.on('line', (line: string) => {
        this.handleWorkerOutput(line)
      })

      this.workerProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim()
        if (msg) {
          console.log('[GlinerWorker stderr]:', msg)
        }
      })

      this.workerProcess.on('exit', (code: number | null) => {
        console.warn(`[GlinerEngine] Worker exited with code ${code}.`)
        this.isModelReady = false
        this.cleanup()
        // Auto-retry if worker crashed and we haven't exhausted retries
        if (code !== 0 && this.retryCount < GlinerEngine.MAX_RETRIES) {
          this.retryCount++
          console.log(`[GlinerEngine] Auto-retry attempt ${this.retryCount}/${GlinerEngine.MAX_RETRIES} in 2 seconds...`)
          setTimeout(() => {
            this.initWorker()
          }, 2000)
        }
      })

      this.workerProcess.on('error', (err: Error) => {
        console.error('[GlinerEngine] Worker process error:', err)
        this.isModelReady = false
        this.cleanup()
      })
    } catch (err) {
      console.error('[GlinerEngine] Failed to launch GLiNER worker:', err)
      this.isModelReady = false
    }
  }

  private cleanup(): void {
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
    this.workerProcess = null
    // Reject any pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer)
      req.reject(new Error('GLiNER worker terminated'))
      this.pendingRequests.delete(id)
    }
  }

  private handleWorkerOutput(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const msg = JSON.parse(trimmed)

      if (msg.status === 'ready') {
        this.isModelReady = true
        this.retryCount = 0
        this.activeModelName = msg.model || 'gliner2-pii'
        console.log('[GlinerEngine] GLiNER2-PII engine is READY for inference.')
        return
      }

      if (typeof msg.id === 'number') {
        const pending = this.pendingRequests.get(msg.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(msg.id)
          pending.resolve(msg.entities || [])
        }
      }
    } catch (err) {
      console.error('[GlinerEngine] Error parsing worker JSON output:', err, trimmed)
    }
  }

  /**
   * Health check to confirm worker responsiveness.
   * If worker is not running, spawns it and waits up to 30 seconds for ready signal.
   */
  public async checkHealth(): Promise<boolean> {
    if (this.isModelReady && this.workerProcess) {
      return true
    }

    // Spawn worker if not running
    this.initWorker()

    // Wait for the worker to signal ready (up to 30 seconds in 500ms intervals)
    const maxWaitMs = 30000
    const intervalMs = 500
    const maxIterations = maxWaitMs / intervalMs
    for (let i = 0; i < maxIterations; i++) {
      if (this.isModelReady) {
        return true
      }
      // If worker died already, no point waiting
      if (!this.workerProcess) {
        console.warn('[GlinerEngine] Worker process is gone during health check wait.')
        return false
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    console.warn('[GlinerEngine] Health check timed out after 30s waiting for worker ready signal.')
    return this.isModelReady
  }

  public getStatus(): EngineStatus {
    return {
      dockerStatus: this.isModelReady ? 'connected' : 'offline',
      activeEngine: this.isModelReady ? 'gliner' : 'fallback_regex',
      isProtectionPaused: this.isProtectionPaused,
      pauseUntil: this.pauseUntil,
      modelName: this.activeModelName,
      supportedEntities: [
        'PERSON', 'FULL_NAME', 'DATE_OF_BIRTH', 'EMAIL', 'PHONE_NUMBER',
        'ADDRESS', 'STREET_ADDRESS', 'CITY', 'STATE_OR_REGION', 'POSTAL_CODE',
        'NATIONAL_ID_NUMBER', 'PASSPORT_NUMBER', 'DRIVERS_LICENSE_NUMBER',
        'GOVERNMENT_ID', 'TAX_ID', 'TAX_NUMBER', 'BANK_ACCOUNT', 'ACCOUNT_NUMBER',
        'CARD_NUMBER', 'CARD_EXPIRY', 'CARD_CVV', 'USERNAME', 'IP_ADDRESS',
        'PASSWORD', 'SECRET', 'API_KEY', 'ORGANIZATION'
      ],
      latencyMs: this.lastLatencyMs
    }
  }

  public isPaused(): boolean {
    if (!this.isProtectionPaused) return false
    if (this.pauseUntil && Date.now() > this.pauseUntil) {
      this.isProtectionPaused = false
      this.pauseUntil = null
      return false
    }
    return true
  }

  public setPaused(paused: boolean, durationMinutes?: number | null): void {
    this.isProtectionPaused = paused
    if (paused && durationMinutes) {
      this.pauseUntil = Date.now() + durationMinutes * 60 * 1000
    } else {
      this.pauseUntil = null
    }
  }

  /**
   * Resolves overlaps and applies span replacements to text.
   */
  public applySpans(
    text: string,
    entities: PIIEntity[],
    strategy: MaskingStrategy = 'tag'
  ): string {
    if (!text || !entities || entities.length === 0) return text

    // Resolve overlapping entity spans (prefer longer span)
    const sortedByLength = [...entities].sort((a, b) => (b.end - b.start) - (a.end - a.start))
    const nonOverlapping: PIIEntity[] = []
    const occupiedIndices = new Set<number>()

    for (const ent of sortedByLength) {
      let hasConflict = false
      for (let i = ent.start; i < ent.end; i++) {
        if (occupiedIndices.has(i)) {
          hasConflict = true
          break
        }
      }
      if (!hasConflict) {
        nonOverlapping.push(ent)
        for (let i = ent.start; i < ent.end; i++) {
          occupiedIndices.add(i)
        }
      }
    }

    // Sort non-overlapping spans descending by start index for in-memory slicing
    nonOverlapping.sort((a, b) => b.start - a.start)

    let masked = text
    for (const ent of nonOverlapping) {
      const origVal = text.substring(ent.start, ent.end)
      let replacement = `<${ent.type}>`

      switch (strategy) {
        case 'redact':
          replacement = '[REDACTED]'
          break
        case 'asterisk':
          replacement = '*'.repeat(Math.min(origVal.length, 8))
          break
        case 'hash':
          replacement = `[${ent.type}_${computeShortHash(origVal)}]`
          break
        case 'tag':
        default:
          replacement = `<${ent.type}>`
          break
      }

      masked = masked.substring(0, ent.start) + replacement + masked.substring(ent.end)
    }

    return masked
  }

  /**
   * Core inference entrypoint: extracts entities and performs exact span replacements.
   */
  public async process(
    text: string,
    strategy: MaskingStrategy = 'tag'
  ): Promise<{ maskedText: string; entities: PIIEntity[] }> {
    if (!text || text.trim().length === 0 || this.isPaused()) {
      return { maskedText: text, entities: [] }
    }

    if (!this.workerProcess || !this.isModelReady) {
      this.initWorker()
      return { maskedText: text, entities: [] }
    }

    const t0 = performance.now()

    try {
      const entities = await this.extractEntities(text)
      this.lastLatencyMs = Math.round(performance.now() - t0)

      if (!entities || entities.length === 0) {
        return { maskedText: text, entities: [] }
      }

      const masked = this.applySpans(text, entities, strategy)
      return { maskedText: masked, entities }
    } catch (err) {
      console.error('[GlinerEngine] Process error:', err)
      return { maskedText: text, entities: [] }
    }
  }

  public extractEntities(text: string): Promise<PIIEntity[]> {
    return new Promise((resolve, reject) => {
      const reqId = ++this.reqSequence

      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId)
        resolve([]) // Return empty on timeout rather than failing
      }, 10000)

      this.pendingRequests.set(reqId, { resolve, reject, timer })

      try {
        const payload = JSON.stringify({ id: reqId, text }) + '\n'
        this.workerProcess?.stdin?.write(payload)
      } catch (err) {
        clearTimeout(timer)
        this.pendingRequests.delete(reqId)
        reject(err)
      }
    })
  }
}

export const glinerEngine = new GlinerEngine()
