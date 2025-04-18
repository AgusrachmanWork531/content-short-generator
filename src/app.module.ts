import { Module } from '@nestjs/common';
import { CutterModule } from './cutter/cutter.module';
import { CleanupService } from './cleanup/cleanup.service';

@Module({
  imports: [CutterModule],
  controllers: [],
  providers: [CleanupService],
})
export class AppModule {}
