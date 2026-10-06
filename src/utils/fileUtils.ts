export const MAX_FILES = 30;
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Calculates SHA-256 hex string using native Web Crypto API.
 */
export async function calculateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if the first 5 bytes are '%PDF-'
 */
export function hasPdfMagicBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const bytes = new Uint8Array(buffer.slice(0, 5));
  // %PDF- in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}
