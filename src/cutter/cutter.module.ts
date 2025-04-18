import { Module } from '@nestjs/common';
import { CutterController } from './cutter.controller';
import { CutterService } from './cutter.service';

@Module({
  controllers: [CutterController],
  providers: [CutterService]
})
export class CutterModule {}
