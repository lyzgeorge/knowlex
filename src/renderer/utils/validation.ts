/**
 * Lightweight validation helpers for renderer code.
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function ensureNonEmptyString(value: unknown, name = 'Value'): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`${name} is required and must be a non-empty string`)
  }
  return value.trim()
}

export function isNonEmptyArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0
}
