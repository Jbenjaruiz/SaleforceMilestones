import { ATTACHMENT_CONTENT_TYPES, ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_PARENT } from './attachment.entity';

export { ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_PARENT };

export type AttachmentContentType = (typeof ATTACHMENT_CONTENT_TYPES)[number];

export interface DetectedFile {
  contentType: AttachmentContentType;
  extension: 'png' | 'jpg' | 'webp' | 'pdf';
}

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte);

/**
 * Identifies a file by its content, never by its name or the browser's declared type,
 * which anyone can fake. Anything that is not one of the allowed types returns null.
 */
export function detectFileType(buffer: Buffer): DetectedFile | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: 'image/png', extension: 'png' };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { contentType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return { contentType: 'image/webp', extension: 'webp' };
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { contentType: 'application/pdf', extension: 'pdf' };
  return null;
}

/**
 * Keeps only a displayable name: no path, no control characters, at most 255 characters.
 * The name is metadata only; files are stored under a generated key and never under this name.
 */
export function sanitizeFileName(name: string | undefined): string {
  // multer decodes the multipart header as latin1; recover UTF-8 names (accents, ñ).
  const decoded = Buffer.from(name ?? '', 'latin1').toString('utf8');
  const base = (decoded.includes('�') ? (name ?? '') : decoded).split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(-255);
  return clean || 'file';
}
