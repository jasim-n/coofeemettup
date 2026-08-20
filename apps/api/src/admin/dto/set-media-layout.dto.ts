import { IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetMediaLayoutDto {
  @IsOptional()
  @IsIn(['cover', 'contain'])
  fit?: 'cover' | 'contain';

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  scale?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsObject()
  collage?: {
    preset?: string;
    columns?: string[];
    rows?: string[];
    cells?: Array<{
      col: number;
      row: number;
      colSpan?: number;
      rowSpan?: number;
    }>;
  };
}
