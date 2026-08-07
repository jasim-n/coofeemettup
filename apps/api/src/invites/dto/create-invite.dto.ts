import { IsString } from 'class-validator';

export class CreateInviteDto {
  @IsString()
  tableId!: string;

  @IsString()
  userId!: string;
}
