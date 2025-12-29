import { Module, OnModuleInit } from '@nestjs/common';
import { TenantBrandController } from './tenant-brand.controller';
import { TenantBrandService } from './tenant-brand.service';
import { DatabaseModule } from 'src/database/database.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantBrandController],
  providers: [TenantBrandService],
  exports: [TenantBrandService],
})
export class TenantBrandModule implements OnModuleInit {
  onModuleInit() {
    // Ensure upload directory exists
    const uploadPath = join(process.cwd(), 'uploads', 'brands');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
  }
}
