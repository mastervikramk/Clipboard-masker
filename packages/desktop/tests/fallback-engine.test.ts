import { describe, it, expect } from 'vitest'
import { FallbackEngine, isValidLuhn, isValidAbaRouting } from '../src/engine/fallback-engine'

describe('FallbackEngine Regex & Algorithmic PII Detection', () => {
  const engine = new FallbackEngine()

  it('validates credit card numbers with Luhn algorithm correctly', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true)
    expect(isValidLuhn('4532015012345671')).toBe(true)
    expect(isValidLuhn('4111111111111112')).toBe(false)
  })

  it('validates ABA Routing Transit Numbers with Mod 10 checksum', () => {
    expect(isValidAbaRouting('021000021')).toBe(true)
    expect(isValidAbaRouting('021000022')).toBe(false)
  })

  it('detects emails and phone numbers in mixed prose', () => {
    const text = 'Reach out to alex.dev@startup.io or call 415-555-0192 tomorrow.'
    const entities = engine.analyze(text)

    expect(entities.length).toBe(2)
    const types = entities.map((e) => e.type)
    expect(types).toContain('EMAIL_ADDRESS')
    expect(types).toContain('PHONE_NUMBER')
  })

  it('detects US Social Security Numbers', () => {
    const text = 'User record SSN: 123-45-6789 on file.'
    const entities = engine.analyze(text)
    expect(entities.some((e) => e.type === 'US_SSN')).toBe(true)
  })

  it('detects API keys and secrets including sk-test format', () => {
    const text = 'Secret token: ghp_1234567890abcdefghijklmnopqrstuvwxyz and key sk-test-1234567890abcdef'
    const entities = engine.analyze(text)
    expect(entities.filter((e) => e.type === 'API_KEY').length).toBe(2)
  })

  it('detects database credentials and extracts password only', () => {
    const text = 'URI: postgres://testuser:TestPassword123@localhost:5432/customerdb'
    const entities = engine.analyze(text)
    const pwEntity = entities.find((e) => e.type === 'PASSWORD')
    expect(pwEntity).toBeDefined()
    expect(pwEntity?.text).toBe('TestPassword123')
  })

  it('masks the user realistic multi-entity benchmark paragraph', () => {
    const userText = `My name is Jonathan Michael Anderson, and I live at 42 Oakwood Street, Apartment 7B, New York, NY 10001, USA. My personal email address is alex@example.com, and you can reach me at 415-555-0199 or my alternate number 212-555-0144. My date of birth is 14 March 1992, and my Social Security Number is 123-45-6789. I work as a Senior Software Engineer at Acme Technologies Inc., located at 350 Fifth Avenue, New York, and my employee ID is EMP-2026-84721. My bank account number is 1234567890, my routing number is 021000021, and my credit card number is 4111-1111-1111-1111 with CVV 123 and expiration date 08/28. My passport number is X12345678, my driver's license number is D1234567, and my health insurance member ID is HLT-987654321. I recently visited Dr. Emily Roberts at Manhattan Medical Center for a consultation regarding my medical history. My public IP address is 198.51.100.1, my private IP address is 192.168.1.1, and my account username is jonathan_anderson92. My API key is sk-test-1234567890abcdef, and my database connection string is postgres://testuser:TestPassword123@localhost:5432/customerdb. My colleague Sarah Williams can be contacted at sarah@example.com, and her phone number is 415-555-0177. We are currently working on Project Phoenix, with confidential customer records belonging to Robert Johnson, who lives at 15 Park Avenue, Boston, MA 02108.`

    const entities = engine.analyze(userText)
    const types = entities.map((e) => e.type)

    // Verify key entities are detected
    expect(types).toContain('PERSON')
    expect(types).toContain('ADDRESS')
    expect(types).toContain('DATE_OF_BIRTH')
    expect(types).toContain('EMPLOYEE_ID')
    expect(types).toContain('BANK_ACCOUNT')
    expect(types).toContain('BANK_ROUTING_NUMBER')
    expect(types).toContain('CVV')
    expect(types).toContain('CARD_EXPIRY')
    expect(types).toContain('PASSPORT')
    expect(types).toContain('DRIVER_LICENSE')
    expect(types).toContain('HEALTH_INSURANCE_ID')
    expect(types).toContain('ORGANIZATION')
    expect(types).toContain('USERNAME')
    expect(types).toContain('API_KEY')
    expect(types).toContain('PASSWORD')

    const masked = engine.anonymize(userText, entities, 'tag')

    // Verify raw values are NOT exposed in masked output
    expect(masked).not.toContain('Jonathan Michael Anderson')
    expect(masked).not.toContain('TestPassword123')
    expect(masked).not.toContain('42 Oakwood Street')
    expect(masked).not.toContain('sk-test-1234567890abcdef')
    expect(masked).not.toContain('14 March 1992')
    expect(masked).not.toContain('EMP-2026-84721')
    expect(masked).not.toContain('021000021')
    expect(masked).not.toContain('X12345678')
    expect(masked).not.toContain('D1234567')
    expect(masked).not.toContain('HLT-987654321')
    expect(masked).not.toContain('Emily Roberts')
    expect(masked).not.toContain('Manhattan Medical Center')
    expect(masked).not.toContain('jonathan_anderson92')
    expect(masked).not.toContain('Sarah Williams')
    expect(masked).not.toContain('Robert Johnson')
  })

  it('masks Indian identity and financial tokens (Aadhaar, PAN, IFSC, UPI, Salary)', () => {
    const text = 'Aadhaar: 2345 6789 0123, PAN: ABCDE1234F, IFSC: SBIN0001234, UPI: arjun.sharma@okaxis, Salary: ₹1,85,000, Host: ARJUN-LAPTOP-042, Mongo: mongodb://admin:SecretPass123@localhost:27017/db'
    const entities = engine.analyze(text)
    const masked = engine.anonymize(text, entities, 'tag')

    expect(masked).not.toContain('2345 6789 0123')
    expect(masked).not.toContain('ABCDE1234F')
    expect(masked).not.toContain('SBIN0001234')
    expect(masked).not.toContain('arjun.sharma@okaxis')
    expect(masked).not.toContain('1,85,000')
    expect(masked).not.toContain('ARJUN-LAPTOP-042')
    expect(masked).not.toContain('SecretPass123')
  })

  it('detects and masks health insurance policy numbers and IDs', () => {
    const text = 'My health insurance policy number is HLT-OD-2026-987654. Another policy # POL-2026-112233.'
    const entities = engine.analyze(text)
    expect(entities.filter((e) => e.type === 'HEALTH_INSURANCE_ID').length).toBe(2)

    const masked = engine.anonymize(text, entities, 'tag')
    expect(masked).not.toContain('HLT-OD-2026-987654')
    expect(masked).not.toContain('POL-2026-112233')
    expect(masked).toContain('<HEALTH_INSURANCE_ID>')
  })

  it('detects and masks Indian phone numbers with +91 country code', () => {
    const text = 'Emergency contact whose phone number is +91 98765 12345 and alternate +91-91234-98765.'
    const entities = engine.analyze(text)
    const phoneEntities = entities.filter((e) => e.type === 'PHONE_NUMBER')
    expect(phoneEntities.length).toBe(2)

    const masked = engine.anonymize(text, entities, 'tag')
    expect(masked).not.toContain('+91 98765 12345')
    expect(masked).not.toContain('+91-91234-98765')
    expect(masked).not.toContain('+91')
  })
})
