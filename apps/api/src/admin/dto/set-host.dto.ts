import { IsBoolean, IsString, Length } from 'class-validator';

export class SetHostDto {
  @IsBoolean()
  canHost!: boolean;
}

export class SetHostByPhoneDto {
  @IsString()
  @Length(10, 16)
  phone!: string;

  @IsBoolean()
  canHost!: boolean;
}
