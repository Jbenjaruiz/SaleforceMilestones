import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_LENGTH } from '../password';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  // No minimum-length rule here: a short wrong password is just a failed login, not a validation error.
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}
