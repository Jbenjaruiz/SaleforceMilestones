import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms';

export class CreateMilestoneDto {
  /** Change-control code such as CC-C01 or CC-M01. No strict format: exceptions exist. Stored in upper case. */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
