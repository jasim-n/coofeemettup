import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @Length(8, 128)
  password?: string;

  /** When false, issue a shorter-lived JWT for session-only sign-in. */
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
