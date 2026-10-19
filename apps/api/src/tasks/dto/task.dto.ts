import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsCalendarDay } from '../../common/calendar';
import { Trim } from '../../common/transforms';

export class CreateTaskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  /** Free text for now; optional. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  responsible?: string;

  @IsCalendarDay()
  startDate: string;

  @IsCalendarDay()
  estimatedDate: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name?: string;

  /** An empty string clears it. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  responsible?: string;

  @IsOptional()
  @IsCalendarDay()
  startDate?: string;

  @IsOptional()
  @IsCalendarDay()
  estimatedDate?: string;
}

export class SetCompletionDto {
  @IsBoolean()
  completed: boolean;
}
