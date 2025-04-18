// src/cleanup/cleanup.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);
  private readonly TMP_DIR = path.join(process.cwd(), 'tmp');
  private readonly MAX_AGE_MINUTES = 60;

  onModuleInit() {
    // Run cleanup every 10 minutes
    setInterval(() => this.cleanupTmpDir(), 10 * 60 * 1000);
    this.logger.log('Cleanup service started, interval 10 min');
  }

  cleanupTmpDir() {
    const now = Date.now();
    const files = fs.readdirSync(this.TMP_DIR);

    files.forEach((file) => {
      const filePath = path.join(this.TMP_DIR, file);
      const stats = fs.statSync(filePath);
      const ageMinutes = (now - stats.mtimeMs) / 1000 / 60;

      if (ageMinutes > this.MAX_AGE_MINUTES) {
        fs.unlink(filePath, (err) => {
          if (err) {
            this.logger.warn(`Failed to delete ${file}: ${err.message}`);
          } else {
            this.logger.log(`Deleted old temp file: ${file}`);
          }
        });
      }
    });
  }
}
