/**
 * Get byte length of a string in UTF-8 encoding
 * bcrypt limit is 72 bytes, not characters
 * Most ASCII chars = 1 byte, some unicode = 2-4 bytes
 */
export function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Check if password is within bcrypt's 72 byte limit
 */
export function isPasswordValid(password: string): boolean {
  return getByteLength(password) <= 72;
}
