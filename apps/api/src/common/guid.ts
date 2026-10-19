import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Matches } from 'class-validator';

/**
 * SQL Server's NEWSEQUENTIALID() produces GUIDs that are not RFC 4122 UUIDs (the version and
 * variant bits are arbitrary), so `IsUUID()` / `ParseUUIDPipe` would reject ids the database itself generated.
 */
export const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IsGuid = () => Matches(GUID_PATTERN, { message: (args) => `${args.property} must be a GUID` });

@Injectable()
export class ParseGuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!GUID_PATTERN.test(value)) throw new BadRequestException('Validation failed (a GUID is expected).');
    return value;
  }
}
