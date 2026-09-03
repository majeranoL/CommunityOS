import { describe, expect, it } from 'vitest'
import {
  communityStepSchema,
  ownerInfoStepSchema,
  getStartedSchema,
} from '@/features/get-started/validation/get-started'

const community = {
  displayName: 'Sunrise Village HOA',
  description: '',
  email: 'hoa@example.com',
  contactNumber: '09171234567',
  address: '123 Sampaguita St., Brgy. San Isidro, Antipolo City, Rizal',
  planId: 'plan-1',
  password: 'Password1',
  confirmPassword: 'Password1',
}

const owner = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  ownerEmail: '',
  phoneNumber: '',
  block: '1',
  lot: '5',
  unit: '',
  homeAddress: '12 Sampaguita St.',
}

describe('get-started validation schemas', () => {
  it('constructs step schemas without throwing', () => {
    expect(communityStepSchema).toBeDefined()
    expect(ownerInfoStepSchema).toBeDefined()
  })

  it('parses a valid community step (with required login email + password)', () => {
    const result = communityStepSchema.safeParse(community)
    expect(result.success).toBe(true)
  })

  it('rejects the community step when the login email is missing', () => {
    const result = communityStepSchema.safeParse({
      ...community,
      email: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejects the community step when the community address is too short', () => {
    const result = communityStepSchema.safeParse({
      ...community,
      address: 'QC City',
    })
    expect(result.success).toBe(false)
  })

  it('parses a valid owner-information step (with household address)', () => {
    const result = ownerInfoStepSchema.safeParse(owner)
    expect(result.success).toBe(true)
  })

  it('rejects the owner step when no household address is provided', () => {
    const result = ownerInfoStepSchema.safeParse({
      ...owner,
      block: '',
      lot: '',
      unit: '',
      homeAddress: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a full payload with mismatched passwords', () => {
    const result = getStartedSchema.safeParse({
      ...community,
      ...owner,
      password: 'Password1',
      confirmPassword: 'Password2',
    })
    expect(result.success).toBe(false)
  })

  it('parses a valid full signup payload', () => {
    const result = getStartedSchema.safeParse({ ...community, ...owner })
    expect(result.success).toBe(true)
  })
})
