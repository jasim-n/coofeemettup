import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../generated/prisma/enums';

export class SetUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
