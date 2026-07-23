/**
 * Utility functions for calculating checksums of component code
 * Used to detect changes in components across deployments
 */

/**
 * Creates a stable string representation of any object by
 * removing functions, undefined values, and normalizing whitespace
 */
export function normalizeCode(code: any): string {
  // Clone the object to avoid modifying the original
  const normalizedObj = JSON.parse(JSON.stringify(code));

  // Convert to string and normalize whitespace
  return JSON.stringify(normalizedObj, null, 0);
}

/**
 * Simple hash function to generate a checksum from a string
 * This is a basic implementation of djb2 hash
 */
export function generateChecksum(str: string): string {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }

  // Convert to a hexadecimal string and ensure it's positive
  return (hash >>> 0).toString(16);
}

/**
 * Generates a checksum for component code that can be used
 * to detect changes across deployments
 */
export function getCodeChecksum(code: any): string {
  const normalizedCode = normalizeCode(code);
  return generateChecksum(normalizedCode);
}
