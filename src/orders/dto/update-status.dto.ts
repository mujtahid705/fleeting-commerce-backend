import { IsEnum } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(Status)
  status: Status;
}
