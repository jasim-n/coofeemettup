import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class ResolveReportDto {
  @IsIn(['RESOLVED', 'ACTIONED'])
  status!: 'RESOLVED' | 'ACTIONED';

  @IsOptional()
  @IsBoolean()
  banSubject?: boolean;
}
