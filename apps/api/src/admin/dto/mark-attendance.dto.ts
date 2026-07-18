import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '../../../generated/prisma/client';

export class MarkAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
