import { IsBoolean } from 'class-validator';

export class VerifyDto {
  @IsBoolean()
  approve!: boolean;
}
