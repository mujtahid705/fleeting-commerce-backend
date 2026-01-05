import { Module } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { LimitCheckerService } from './services/limit-checker.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FileUploadService, LimitCheckerService, SubscriptionGuard],
  exports: [FileUploadService, LimitCheckerService, SubscriptionGuard],
})
export class CommonModule {}
