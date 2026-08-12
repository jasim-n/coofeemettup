import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  phone?: string;

  // Required for NEW accounts only (enforced in the service).
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^@?[a-zA-Z0-9_]{3,20}$/, {
    message: 'Handle must be 3–20 letters, numbers or underscores',
  })
  username?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
