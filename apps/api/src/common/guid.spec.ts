import { BadRequestException } from '@nestjs/common';
import { GUID_PATTERN, ParseGuidPipe } from './guid';

describe('GUID validation', () => {
  it('accepts the GUIDs SQL Server generates, which are not valid RFC 4122 UUIDs', () => {
    expect(GUID_PATTERN.test('5B3E4A10-9C2D-F011-8E2A-0050568F1A2B')).toBe(true);
    expect(GUID_PATTERN.test('4f3b2a10-9c2d-4011-8e2a-0050568f1a2b')).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of ['', 'abc', '123', '5B3E4A10-9C2D-F011-8E2A-0050568F1A2', "x'; DROP TABLE users;--"]) {
      expect(GUID_PATTERN.test(bad)).toBe(false);
    }
  });

  it('the pipe returns valid values and throws 400 otherwise', () => {
    const pipe = new ParseGuidPipe();
    expect(pipe.transform('5B3E4A10-9C2D-F011-8E2A-0050568F1A2B')).toBe('5B3E4A10-9C2D-F011-8E2A-0050568F1A2B');
    expect(() => pipe.transform('nope')).toThrow(BadRequestException);
  });
});
