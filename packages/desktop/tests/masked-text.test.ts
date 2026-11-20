import { describe, it, expect } from 'vitest'
import { splitMaskTags, formatEntityType } from '../src/renderer/src/components/MaskedText'

describe('splitMaskTags', () => {
  it('splits tag placeholders from surrounding text', () => {
    expect(splitMaskTags('mail <EMAIL_ADDRESS> now')).toEqual([
      { text: 'mail ', isTag: false },
      { text: '<EMAIL_ADDRESS>', isTag: true },
      { text: ' now', isTag: false }
    ])
  })

  it('recognises redact and hash formats', () => {
    const tags = splitMaskTags('a [REDACTED] b [#1a2b3c4d] c [PERSON_0f9e8d7c]')
      .filter((p) => p.isTag)
      .map((p) => p.text)
    expect(tags).toEqual(['[REDACTED]', '[#1a2b3c4d]', '[PERSON_0f9e8d7c]'])
  })

  it('handles adjacent tags and tags at the edges', () => {
    expect(splitMaskTags('<PERSON><PHONE_NUMBER>')).toEqual([
      { text: '<PERSON>', isTag: true },
      { text: '<PHONE_NUMBER>', isTag: true }
    ])
  })

  it('leaves plain text and look-alikes untouched', () => {
    expect(splitMaskTags('if a < b and <div> [note]')).toEqual([
      { text: 'if a < b and <div> [note]', isTag: false }
    ])
    expect(splitMaskTags('')).toEqual([])
  })
})

describe('formatEntityType', () => {
  it('turns entity codes into readable labels', () => {
    expect(formatEntityType('EMAIL_ADDRESS')).toBe('Email address')
    expect(formatEntityType('US_SSN')).toBe('US SSN')
    expect(formatEntityType('API_KEY')).toBe('API key')
    expect(formatEntityType('HEALTH_INSURANCE_ID')).toBe('Health insurance ID')
    expect(formatEntityType('PERSON')).toBe('Person')
  })
})
