import { randomBytes } from 'crypto'

export function generateId(): string {
  return randomBytes(16).toString('hex')
}

// Note: short id and UUID helpers removed to reduce unused surface area.
