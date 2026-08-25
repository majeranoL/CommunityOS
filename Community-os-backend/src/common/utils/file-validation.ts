import { extname } from 'path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
  'application/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.svg',
  '.html',
  '.htm',
  '.js',
  '.mjs',
  '.cjs',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.vbs',
  '.jsp',
  '.php',
]);

type MagicFamily =
  'pdf' | 'png' | 'jpeg' | 'webp' | 'gif' | 'zip' | 'ole' | 'text' | 'json';

function detectFamily(buffer: Buffer): MagicFamily | undefined {
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('latin1') === '%PDF') {
    return 'pdf';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('latin1') === 'RIFF' &&
    buffer.slice(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }

  if (
    buffer.length >= 6 &&
    (buffer.slice(0, 6).toString('latin1') === 'GIF87a' ||
      buffer.slice(0, 6).toString('latin1') === 'GIF89a')
  ) {
    return 'gif';
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return 'zip';
  }

  if (
    buffer.length >= 8 &&
    buffer.slice(0, 8).toString('latin1') === '\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
  ) {
    return 'ole';
  }

  if (buffer.length > 0 && !buffer.includes(0x00)) {
    return 'text';
  }

  return undefined;
}

function mimeToFamily(mimetype: string): MagicFamily | undefined {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/jpeg') return 'jpeg';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/gif') return 'gif';
  if (
    mimetype.includes('wordprocessingml') ||
    mimetype.includes('spreadsheetml') ||
    mimetype.includes('presentationml') ||
    mimetype === 'application/zip' ||
    mimetype === 'application/x-zip-compressed'
  ) {
    return 'zip';
  }
  if (
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.ms-powerpoint'
  ) {
    return 'ole';
  }
  if (mimetype === 'application/json') return 'json';
  if (
    mimetype === 'text/plain' ||
    mimetype === 'text/csv' ||
    mimetype === 'application/csv'
  ) {
    return 'text';
  }
  return undefined;
}

function looksLikeHtmlOrSvg(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 2048)
    .toString('utf8')
    .trimStart()
    .toLowerCase();

  return (
    head.startsWith('<svg') ||
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    (head.startsWith('<?xml') && head.includes('<svg')) ||
    head.includes('<script')
  );
}

export function isAllowedMimetype(mimetype: string): boolean {
  return ALLOWED_MIMETYPES.has(mimetype);
}

export function isAllowedExtension(filename: string): boolean {
  return !BLOCKED_EXTENSIONS.has(extname(filename).toLowerCase());
}

export type FileValidationResult =
  { ok: true; mimetype: string } | { ok: false; reason: string };

export function validateFile(
  buffer: Buffer,
  declaredMimetype: string,
  originalName: string,
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { ok: false, reason: 'Empty file' };
  }

  if (!isAllowedMimetype(declaredMimetype)) {
    return {
      ok: false,
      reason: `File type "${declaredMimetype}" is not allowed`,
    };
  }

  if (!isAllowedExtension(originalName)) {
    return {
      ok: false,
      reason: `File extension "${extname(originalName)}" is not allowed`,
    };
  }

  const family = mimeToFamily(declaredMimetype);
  const detected = detectFamily(buffer);

  if (family === 'text' || family === 'json') {
    if (looksLikeHtmlOrSvg(buffer)) {
      return { ok: false, reason: 'HTML/SVG content is not allowed' };
    }
    return { ok: true, mimetype: declaredMimetype };
  }

  if (detected !== family) {
    return {
      ok: false,
      reason: `File content does not match its declared type (${declaredMimetype})`,
    };
  }

  return { ok: true, mimetype: declaredMimetype };
}
