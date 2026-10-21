import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PERMISSION_CODES, PermissionCode } from '../permissions';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** No longer used for access (permissions are assigned per project); kept optional for compatibility. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CODES, { each: true })
  permissions?: PermissionCode[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CODES, { each: true })
  permissions?: PermissionCode[];
}
