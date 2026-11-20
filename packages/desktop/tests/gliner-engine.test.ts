import { describe, it, expect } from 'vitest'
import { glinerEngine } from '../src/engine/gliner-engine'

describe('GlinerEngine Standalone Worker', () => {
  it('extracts entities and masks text via bundled worker', async () => {
    // Wait for worker readiness (cold boot may take ~10-12s)
    let ready = false
    for (let i = 0; i < 30; i++) {
      ready = await glinerEngine.checkHealth()
      if (ready) break
      await new Promise((r) => setTimeout(r, 500))
    }

    expect(ready).toBe(true)

    const text = 'Dr. Priya Sharma reviewed medical records at Apollo Hospitals in London'
    const res = await glinerEngine.process(text, 'tag')

    expect(res.entities.length).toBeGreaterThan(0)
    expect(res.maskedText).not.toBe(text)
  }, 25000)
})
