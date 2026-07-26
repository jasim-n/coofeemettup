import { IsBoolean } from 'class-validator';

export class SetHostDto {
  @IsBoolean()
  canHost!: boolean;
}
