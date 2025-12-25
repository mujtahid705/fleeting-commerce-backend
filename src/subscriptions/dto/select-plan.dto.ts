import { IsString, IsUUID } from 'class-validator';

export class SelectPlanDto {
  @IsString()
  @IsUUID()
  planId: string;
}
