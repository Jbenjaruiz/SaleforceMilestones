import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { IsGuid } from '../../common/guid';

/** «Ver» is implied by the assignment itself; these are the extra things the user may do with the project's content. */
export class AssignmentDto {
  @IsGuid()
  projectId: string;

  @IsBoolean()
  create: boolean;

  @IsBoolean()
  update: boolean;

  @IsBoolean()
  delete: boolean;
}

export class ReplaceAssignmentsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  assignments: AssignmentDto[];
}
