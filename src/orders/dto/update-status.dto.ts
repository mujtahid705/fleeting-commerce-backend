import { IsEnum } from 'class-validator';
import { Status } from 'generated/prisma';

export class UpdateStatusDto {
  @IsEnum(Status)
  status: Status;
}
