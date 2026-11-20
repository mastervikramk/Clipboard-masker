import React from 'react'

// Placeholders produced by the masking engines:
// <EMAIL_ADDRESS>, [REDACTED], [#1a2b3c4d], [PERSON_1a2b3c4d]
const MASK_TAG = /(<[A-Z][A-Z0-9_]*>|\[REDACTED\]|\[#[0-9a-f]{8}\]|\[[A-Z][A-Z0-9_]*_[0-9a-f]{8}\])/

export interface TextPart {
  text: string
  isTag: boolean
}

export function splitMaskTags(text: string): TextPart[] {
  // With one capture group, split() alternates plain text and tags: odd indices are tags.
  return text
    .split(MASK_TAG)
    .map((part, i) => ({ text: part, isTag: i % 2 === 1 }))
    .filter((part) => part.text.length > 0)
}

const ACRONYMS = new Set(['API', 'CVV', 'ID', 'IP', 'PAN', 'IFSC', 'UPI', 'SSN', 'US', 'URL', 'IBAN'])

/** EMAIL_ADDRESS -> "Email address", US_SSN -> "US SSN" */
export function formatEntityType(type: string): string {
  const words = type.split('_').filter(Boolean)
  if (words.length === 0) return type
  return words
    .map((word, i) => {
      const upper = word.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      const lower = word.toLowerCase()
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
    })
    .join(' ')
}

interface MaskedTextProps {
  text: string
  className?: string
  title?: string
  onClick?: () => void
}

export const MaskedText: React.FC<MaskedTextProps> = ({ text, className = '', title, onClick }) => (
  <div className={className} title={title} onClick={onClick}>
    {splitMaskTags(text).map((part, i) =>
      part.isTag ? (
        <span
          key={i}
          className="rounded px-1 py-px font-medium bg-[var(--mask-tag-bg)] text-[var(--mask-tag-text)]"
        >
          {part.text}
        </span>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </div>
)
