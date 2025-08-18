import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';
import { FileUploadService } from 'src/common/services/file-upload.service';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    MulterModule.registerAsync({
      imports: [CommonModule],
      inject: [FileUploadService],
      useFactory: (fileUploadService: FileUploadService) =>
        fileUploadService.getMulterConfig(),
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
