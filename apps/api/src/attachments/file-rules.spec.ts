import { detectFileType, sanitizeFileName } from './file-rules';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const pdf = Buffer.from('%PDF-1.7\n%âãÏÓ');

describe('detectFileType', () => {
  it('recognizes the four allowed types by their content', () => {
    expect(detectFileType(png)).toEqual({ contentType: 'image/png', extension: 'png' });
    expect(detectFileType(jpeg)).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
    expect(detectFileType(webp)).toEqual({ contentType: 'image/webp', extension: 'webp' });
    expect(detectFileType(pdf)).toEqual({ contentType: 'application/pdf', extension: 'pdf' });
  });

  it('rejects everything else, whatever the name or declared type says', () => {
    expect(detectFileType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(Buffer.from('MZ\x90\x00'))).toBeNull(); // Windows executable
    expect(detectFileType(Buffer.from('GIF89a'))).toBeNull(); // GIF is not allowed
    expect(detectFileType(Buffer.from('RIFF....WAVEfmt '))).toBeNull(); // RIFF but not WebP
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(Buffer.from([0x89, 0x50]))).toBeNull(); // truncated
  });
});

describe('sanitizeFileName', () => {
  it('drops any path and control characters', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\Users\\x\\foto.png')).toBe('foto.png');
    expect(sanitizeFileName('a\u0000b\nc.png')).toBe('abc.png');
  });

  it('keeps accents that multer decoded as latin1', () => {
    const asMulterSees = Buffer.from('Captura ñandú.png', 'utf8').toString('latin1');
    expect(sanitizeFileName(asMulterSees)).toBe('Captura ñandú.png');
    expect(sanitizeFileName('plain.png')).toBe('plain.png');
  });

  it('falls back to a safe name and caps the length', () => {
    expect(sanitizeFileName(undefined)).toBe('file');
    expect(sanitizeFileName('   ')).toBe('file');
    expect(sanitizeFileName('x'.repeat(400)).length).toBe(255);
  });
});
