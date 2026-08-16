/**
 * Minimal, dependency-free sanitisation for user-generated content.
 *
 * The storefront never renders raw HTML (React escapes by default), so this is
 * defence in depth: we strip tags and control characters before persisting any
 * free-text the public can submit — contact messages, review bodies, order notes.
 */

const TAG = /<[^>]*>/g;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripTags(input: string): string {
  return input.replace(TAG, '');
}

export function sanitizeText(input: string, maxLength = 5000): string {
  return stripTags(String(input))
    .replace(CONTROL, '')
    .replace(/\s+\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(input: string): string {
  return String(input).trim().toLowerCase().slice(0, 320);
}
