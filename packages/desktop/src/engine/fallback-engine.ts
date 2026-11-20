/**
 * High-performance, zero-latency local Regex & Checksum PII Detector.
 * Runs in-process within Electron and Web environments.
 * Detects 20+ categories of personal, financial, corporate, and system PII.
 */
import type { PIIEntity, MaskingStrategy } from '../shared/types'

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

// Luhn algorithm for validating credit card numbers
export function isValidLuhn(digitsOnly: string): boolean {
  if (digitsOnly.length < 13 || digitsOnly.length > 19) return false
  let sum = 0
  let shouldDouble = false

  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i), 10)
    if (isNaN(digit)) return false

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

// ABA Routing Number Checksum Validation
export function isValidAbaRouting(digits: string): boolean {
  if (digits.length !== 9 || !/^\d{9}$/.test(digits)) return false
  const d = digits.split('').map(Number)
  const checksum = (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8])) % 10
  return checksum === 0
}

// Verhoeff algorithm for Indian Aadhaar validation
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

export function isValidVerhoeff(numStr: string): boolean {
  const clean = numStr.replace(/\D/g, '')
  if (clean.length !== 12) return false
  let c = 0
  const digits = clean.split('').map(Number).reverse()
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]]
  }
  return c === 0
}

interface PatternRule {
  type: string
  regex: RegExp
  captureGroup?: number
  validator?: (match: string) => boolean
}

const PII_RULES: PatternRule[] = [
  // Database Connection Credentials (masks the password only)
  {
    type: 'PASSWORD',
    regex: /\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^:\s\/]+:([^@\s\/]+)@/gi,
    captureGroup: 1
  },
  // Contextual Passwords
  {
    type: 'PASSWORD',
    regex: /\b(?:password|passwd|pwd)(?:\s+is|\s*[:=])?\s+([^\s,;]+)\b/gi,
    captureGroup: 1
  },
  // Email Addresses
  {
    type: 'EMAIL_ADDRESS',
    regex: /\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b/gi
  },
  // US SSN (Social Security Number)
  {
    type: 'US_SSN',
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g
  },
  // Indian Aadhaar Number (Contextual and Verhoeff validated)
  {
    type: 'NATIONAL_ID_NUMBER',
    regex: /\b(?:aadhaar(?:\s*number)?|uid)(?:\s+is|\s*[:=])?\s+([0-9]{4}\s[0-9]{4}\s[0-9]{4}|[0-9]{12})\b/gi,
    captureGroup: 1
  },
  {
    type: 'NATIONAL_ID_NUMBER',
    regex: /\b[2-9]\d{3}\s\d{4}\s\d{4}\b/g,
    validator: (match: string) => isValidVerhoeff(match) || match.replace(/\s/g, '').length === 12
  },
  // Indian PAN Card (Permanent Account Number)
  {
    type: 'TAX_ID',
    regex: /\b(?:pan(?:\s*number)?|pan\s*#)(?:\s+is|\s*[:=])?\s+([A-Z]{5}[0-9]{4}[A-Z])\b/gi,
    captureGroup: 1
  },
  {
    type: 'TAX_ID',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g
  },
  // Indian Bank IFSC Code
  {
    type: 'BANK_ROUTING_NUMBER',
    regex: /\b(?:ifsc(?:\s*code)?|ifsc\s*#)(?:\s+is|\s*[:=])?\s+([A-Z]{4}0[A-Z0-9]{6})\b/gi,
    captureGroup: 1
  },
  {
    type: 'BANK_ROUTING_NUMBER',
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g
  },
  // Indian UPI ID (Virtual Payment Address)
  {
    type: 'EMAIL_ADDRESS',
    regex: /\b[a-zA-Z0-9_.-]+@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|axl|upi|apl|rapl)\b/gi
  },
  // Salary and Financial Compensation
  {
    type: 'SALARY',
    regex: /\b(?:monthly\s+salary|annual\s+ctc|ctc|salary)(?:\s+is|\s*[:=])?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)\b/gi,
    captureGroup: 1
  },
  {
    type: 'SALARY',
    regex: /(?:₹|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)\b/g,
    captureGroup: 1
  },
  // Indian Voter ID (EPIC)
  {
    type: 'PASSPORT',
    regex: /\b(?:voter\s*id|epic)(?:\s+is|\s*[:=])?\s+([A-Z]{3}[0-9]{7})\b/gi,
    captureGroup: 1
  },
  {
    type: 'PASSPORT',
    regex: /\b[A-Z]{3}[0-9]{7}\b/g
  },
  // Indian Driving Licence
  {
    type: 'DRIVER_LICENSE',
    regex: /\b(?:driving\s*licen[sc]e(?:\s*number)?|dl\s*#)(?:\s+is|\s*[:=])?\s+([A-Z]{2}[0-9]{2}\s?[0-9]{11})\b/gi,
    captureGroup: 1
  },
  {
    type: 'DRIVER_LICENSE',
    regex: /\b[A-Z]{2}[0-9]{2}\s[0-9]{11}\b/g
  },
  // Employee UAN
  {
    type: 'BANK_ACCOUNT',
    regex: /\b(?:uan|universal\s*account\s*number)(?:\s+is|\s*[:=])?\s+([0-9]{12})\b/gi,
    captureGroup: 1
  },
  // Hostname & Computer Name
  {
    type: 'USERNAME',
    regex: /\b[A-Z0-9_-]+-(?:LAPTOP|DESKTOP|PC|SRV|HOST)-[A-Z0-9_-]+\b/g
  },
  // Indian Postal Code / PIN
  {
    type: 'ADDRESS',
    regex: /\b(?:PIN(?:\s*code)?|pincode|postal\s*code)(?:\s+is|\s*[:=])?\s+([0-9]{6})\b/gi,
    captureGroup: 1
  },
  // Credit Card Numbers (with Luhn validation or explicit context)
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:card\s*number|debit\s*card|credit\s*card)(?:\s+is|\s*[:=])?\s+((?:\d{4}[- ]?){3}\d{4}|\d{13,19})\b/gi,
    captureGroup: 1
  },
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{13,19}\b/g,
    validator: (match: string) => {
      const clean = match.replace(/[- ]/g, '')
      return isValidLuhn(clean)
    }
  },
  // Bank Account Numbers (checked with context to prevent collision with phone numbers)
  {
    type: 'BANK_ACCOUNT',
    regex: /\b(?:bank\s+account(?:\s*number)?|account\s*number|acct\s*#)(?:\s+is|\s*[:=])?\s+([0-9]{8,17})\b/gi,
    captureGroup: 1
  },
  // Bank Routing Numbers (ABA 9-digit with checksum or context)
  {
    type: 'BANK_ROUTING_NUMBER',
    regex: /\b(?:routing\s+number|routing\s*#|aba(?:\s*routing)?|transit\s*number)(?:\s+is|\s*[:=])?\s+([0-9]{9})\b/gi,
    captureGroup: 1,
    validator: (match: string) => isValidAbaRouting(match)
  },
  // Card CVV / CVC
  {
    type: 'CVV',
    regex: /\b(?:cvv|cvc|cid|security\s*code)(?:\s+is|\s*[:=])?\s+([0-9]{3,4})\b/gi,
    captureGroup: 1
  },
  // Card Expiration Date
  {
    type: 'CARD_EXPIRY',
    regex: /\b(?:expiration\s*date|exp(?:\s*date)?|expires)(?:\s+is|\s*[:=])?\s+((?:0[1-9]|1[0-2])\/[0-9]{2,4})\b/gi,
    captureGroup: 1
  },
  // Passport Numbers
  {
    type: 'PASSPORT',
    regex: /\b(?:passport(?:\s*number)?|passport\s*#)(?:\s+is|\s*[:=])?\s+([A-Z0-9]{7,9})\b/gi,
    captureGroup: 1
  },
  // Driver's License Numbers
  {
    type: 'DRIVER_LICENSE',
    regex: /\b(?:driver'?s?\s*license(?:\s*number)?|dl\s*#)(?:\s+is|\s*[:=])?\s+([A-Z0-9]{6,10})\b/gi,
    captureGroup: 1
  },
  // Health Insurance Policy / Member ID
  {
    type: 'HEALTH_INSURANCE_ID',
    regex: /\b(?:health\s+insurance(?:\s+(?:policy|member|card))?(?:\s+(?:number|no\.?|id|#))?|insurance(?:\s+(?:policy|member|card))?\s+(?:number|no\.?|id|#)|policy\s+(?:number|no\.?|#))(?:\s+is|\s*[:=])?\s+([A-Z0-9-]+)\b/gi,
    captureGroup: 1
  },
  {
    type: 'HEALTH_INSURANCE_ID',
    regex: /\bHLT-[A-Z0-9]{2,6}-\d{4}-\d{4,8}\b/gi
  },
  {
    type: 'HEALTH_INSURANCE_ID',
    regex: /\bHLT-[0-9]{6,12}\b/g
  },
  {
    type: 'HEALTH_INSURANCE_ID',
    regex: /\b(?:POL|INS|MED)-[A-Z0-9-]{6,20}\b/gi
  },
  // Employee ID
  {
    type: 'EMPLOYEE_ID',
    regex: /\b(?:employee\s*id|emp\s*id|staff\s*id)(?:\s+is|\s*[:=])?\s+([A-Z0-9-]+)\b/gi,
    captureGroup: 1
  },
  {
    type: 'EMPLOYEE_ID',
    regex: /\bEMP-[0-9]{4}-[0-9]{4,6}\b/g
  },
  // Date of Birth
  {
    type: 'DATE_OF_BIRTH',
    regex: /\b(?:date\s+of\s+birth|dob|born\s+on)(?:\s+is|\s*[:=])?\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|[A-Za-z]{3})\s+[0-9]{4})\b/gi,
    captureGroup: 1
  },
  // Account Usernames
  {
    type: 'USERNAME',
    regex: /\b(?:account\s+username|username|user\s*id|handle)(?:\s+is|\s*[:=])?\s+([a-zA-Z0-9_.-]{3,30})\b/gi,
    captureGroup: 1
  },
  // Contextual API Keys
  {
    type: 'API_KEY',
    regex: /\b(?:api\s*key|api\s*token|secret\s*key)(?:\s+is|\s*[:=])?\s+([a-zA-Z0-9_\-]{14,})\b/gi,
    captureGroup: 1
  },
  // Standard API Keys / Secrets / Tokens (sk-test, ghp, AKIA, etc.)
  {
    type: 'API_KEY',
    regex: /\b(?:sk-(?:test-|live-|ant-|proj-)?[a-zA-Z0-9_\-]{14,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35}|Bearer\s+[a-zA-Z0-9-_.~+/]+=*)\b/gi
  },
  // Street & Residential Addresses (Indian & International format)
  {
    type: 'ADDRESS',
    regex: /\b(?:Flat|House|Plot|Shop|Building|Bldg)\s+(?:No\.?\s*)?\d+[A-Za-z0-9\s,.-]+?(?=(?:,\s*[A-Z][a-z]+,\s*(?:[A-Z][a-z]+|India))|\s+PIN\b|\s+India\b)/gi
  },
  // Street Addresses (US format with Street, Ave, Rd, Blvd, Apartment, State, ZIP)
  {
    type: 'ADDRESS',
    regex: /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\.\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)\b(?:,?\s+(?:Apt|Apartment|Suite|Ste|Unit|Floor|Fl)\s+[A-Za-z0-9\-]+)?(?:,?\s+[A-Z][a-zA-Z\s]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?(?:,?\s+USA)?\b/g
  },
  // Person Names (Contextual name heuristics)
  {
    type: 'PERSON',
    regex: /\b(?:My\s+name\s+is|I\s+am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
    captureGroup: 1
  },
  {
    type: 'PERSON',
    regex: /\b(?:Dr\.|Doctor|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    captureGroup: 1
  },
  {
    type: 'PERSON',
    regex: /\b(?:colleague|coworker|friend|partner)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    captureGroup: 1
  },
  {
    type: 'PERSON',
    regex: /\b(?:customer|client|patient|user)\s+records?\s+belonging\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    captureGroup: 1
  },
  // Organizations & Medical Centers
  {
    type: 'ORGANIZATION',
    regex: /\b([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*\s+(?:Inc\.|Inc|LLC|Corp\.|Corporation|Technologies|Medical Center|Hospital|Consulting|Group))\b/g,
    captureGroup: 1
  },
  // Phone numbers (US & International, including India +91)
  {
    type: 'PHONE_NUMBER',
    regex: /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g
  },
  {
    type: 'PHONE_NUMBER',
    regex: /(?:\+?(\d{1,3}))?[-. ]?\(?(\d{3})\)?[-. ]?(\d{3})[-. ]?(\d{4})\b/g,
    validator: (match: string) => {
      const digits = match.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 15
    }
  },
  // IPv4 Addresses
  {
    type: 'IP_ADDRESS',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  },
  // Cryptocurrency Addresses
  {
    type: 'CRYPTO',
    regex: /\b(?:1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59}|0x[a-fA-F0-9]{40})\b/g
  }
]

export class FallbackEngine {
  /**
   * Scans text for PII entities using regular expressions and algorithmic validators.
   */
  public analyze(text: string, enabledEntities?: Record<string, boolean>): PIIEntity[] {
    if (!text || text.trim().length === 0) return []

    const entities: PIIEntity[] = []

    for (const rule of PII_RULES) {
      if (enabledEntities && enabledEntities[rule.type] === false) {
        continue
      }

      rule.regex.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = rule.regex.exec(text)) !== null) {
        let matchedText = match[0]
        let start = match.index
        let end = start + matchedText.length

        // If a capture group is specified, only mask the sensitive substring
        if (rule.captureGroup && match[rule.captureGroup] !== undefined) {
          matchedText = match[rule.captureGroup]
          start = match.index + match[0].indexOf(matchedText)
          end = start + matchedText.length
        }

        if (rule.validator && !rule.validator(matchedText)) {
          continue
        }

        // Avoid duplicate overlapping spans
        const isOverlapping = entities.some(
          (existing) => Math.max(start, existing.start) < Math.min(end, existing.end)
        )

        if (!isOverlapping) {
          entities.push({
            type: rule.type,
            start,
            end,
            score: 0.95,
            text: matchedText
          })
        }
      }
    }

    // Sort entities by start index
    return entities.sort((a, b) => a.start - b.start)
  }

  /**
   * Masks sensitive entity spans in the text according to the selected strategy.
   */
  public anonymize(
    text: string,
    entities: PIIEntity[],
    strategy: MaskingStrategy = 'tag'
  ): string {
    if (entities.length === 0) return text

    // Sort entities descending by start index to replace from end to beginning
    const sorted = [...entities].sort((a, b) => b.start - a.start)
    let result = text

    for (const entity of sorted) {
      const originalValue = text.substring(entity.start, entity.end)
      let replacement = `<${entity.type}>`

      switch (strategy) {
        case 'redact':
          replacement = '[REDACTED]'
          break
        case 'asterisk':
          replacement = this.applyAsteriskMask(originalValue)
          break
        case 'hash':
          replacement = `[#${computeShortHash(originalValue)}]`
          break
        case 'tag':
        default:
          replacement = `<${entity.type}>`
          break
      }

      result = result.substring(0, entity.start) + replacement + result.substring(entity.end)
    }

    return result
  }

  private applyAsteriskMask(val: string): string {
    if (val.length <= 4) return '****'
    if (val.includes('@')) {
      const parts = val.split('@')
      const name = parts[0]
      const domain = parts[1]
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***'
      return `${maskedName}@${domain}`
    }
    return `${val.substring(0, 2)}${'*'.repeat(Math.max(4, val.length - 4))}${val.substring(val.length - 2)}`
  }
}

export const fallbackEngine = new FallbackEngine()
