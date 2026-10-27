import { BadRequestException } from '@nestjs/common';
import { crc32, inflateRawSync } from 'node:zlib';
import { extname } from 'node:path';
export const MAX_RESUME_SIZE = 5 * 1024 * 1024;
export interface ResumeUpload { originalname: string; mimetype: string; size: number; buffer: Buffer }
export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function validateDocx(bytes: Buffer) {
  if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) throw new Error('Invalid ZIP signature');
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > bytes.length || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length) throw new Error('Invalid ZIP directory');
  const count = bytes.readUInt16LE(end + 10);
  const offset = bytes.readUInt32LE(end + 16);
  if (!count || count > 128 || offset + bytes.readUInt32LE(end + 12) !== end || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new Error('Unsupported ZIP');
  const names = new Set<string>();
  const documents = new Map<string, string>();
  let cursor = offset;
  let expanded = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const checksum = bytes.readUInt32LE(cursor + 16);
    const compressed = bytes.readUInt32LE(cursor + 20);
    const size = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const local = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameSize).toString('utf8');
    if ((flags & 1) || ![0, 8].includes(method) || !name || name.includes('..') || name.startsWith('/') || name.includes('\\') || name.includes(':') || /\.(bin|exe|js)$/i.test(name) || names.has(name)) throw new Error('Unsafe ZIP entry');
    names.add(name);
    expanded += size;
    if (expanded > 20 * 1024 * 1024 || local + 30 > offset || bytes.readUInt32LE(local) !== 0x04034b50) throw new Error('ZIP limit');
    const localNameSize = bytes.readUInt16LE(local + 26);
    const start = local + 30 + localNameSize + bytes.readUInt16LE(local + 28);
    if (start + compressed > offset || bytes.subarray(local + 30, local + 30 + localNameSize).toString('utf8') !== name) throw new Error('ZIP entry mismatch');
    const encoded = bytes.subarray(start, start + compressed);
    const decoded = method === 8 ? inflateRawSync(encoded, { maxOutputLength: 20 * 1024 * 1024 }) : encoded;
    if (decoded.length !== size || crc32(decoded) !== checksum) throw new Error('ZIP integrity');
    if (['[Content_Types].xml', 'word/document.xml', '_rels/.rels'].includes(name)) documents.set(name, decoded.toString('utf8'));
    cursor += 46 + nameSize + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
  }
  if (cursor !== end || !documents.has('_rels/.rels') ||
      !documents.get('[Content_Types].xml')?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') ||
      !documents.get('word/document.xml')?.includes('http://schemas.openxmlformats.org/wordprocessingml/2006/main') ||
      [...documents.values()].some((xml) => /<!DOCTYPE|<!ENTITY|macroEnabled/i.test(xml))) throw new Error('Invalid DOCX');
}
export function validateResume(file: ResumeUpload | undefined): string {
  if (!file || !file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_RESUME_SIZE) throw new BadRequestException('Envie um currículo de até 5 MB');
  const extension = extname(file.originalname).toLowerCase();
  try {
    if (extension === '.pdf' && file.mimetype === PDF_MIME) {
      if (!/^%PDF-(1\.[0-7]|2\.0)/.test(file.buffer.subarray(0, 8).toString('ascii')) || !file.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) throw new Error('Invalid PDF');
      return PDF_MIME;
    }
    if (extension === '.docx' && file.mimetype === DOCX_MIME) {
      validateDocx(file.buffer);
      return DOCX_MIME;
    }
  } catch { throw new BadRequestException('Conteúdo do arquivo inválido para PDF ou DOCX'); }
  throw new BadRequestException('Formato permitido: PDF ou DOCX, com extensão e MIME correspondentes');
}
