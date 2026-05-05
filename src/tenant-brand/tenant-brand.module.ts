import { Module } from '@nestjs/common';
import { TenantBrandController } from './tenant-brand.controller';
import { TenantBrandService } from './tenant-brand.service';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [TenantBrandController],
  providers: [TenantBrandService],
  exports: [TenantBrandService],
})
export class TenantBrandModule {}
