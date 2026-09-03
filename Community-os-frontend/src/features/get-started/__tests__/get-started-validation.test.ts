import { describe, expect, it } from 'vitest'
import {
  accountStepSchema,
  communityStepSchema,
  getStartedSchema,
} from '@/features/get-started/validation/get-started'

describe('get-started validation schemas', () => {
  it('allows .pick()-based step schemas to be constructed without throwing', () => {
    expect(communityStepSchema).toBeDefined()
    expect(accountStepSchema).toBeDefined()
  })

  it('parses a valid community step payload', () => {
    const result = communityStepSchema.safeParse({
      displayName: 'Sunrise Village HOA',
      email: '',
      contactNumber: '09171234567',
      address: 'Quezon City',
      planId: 'plan-1',
    })
    expect(result.success).toBe(true)
  })

  it('parses a valid owner-account step payload', () => {
    const result = accountStepSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      ownerEmail: 'juan@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a full payload with mismatched passwords', () => {
    const result = getStartedSchema.safeParse({
      displayName: 'Sunrise Village HOA',
      email: '',
      contactNumber: '',
      address: '',
      planId: 'plan-1',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      ownerEmail: 'juan@example.com',
      password: 'Password1',
      confirmPassword: 'Password2',
    })
    expect(result.success).toBe(false)
  })
})
