import { IsEnum } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

export class SetUserRoleDto {
  @IsEnum(Role)
  role!: Role;
}
