import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms';

export class CreateCommentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;
}
