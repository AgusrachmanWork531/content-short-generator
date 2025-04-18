import { Controller, Post, Body } from '@nestjs/common';
import { CutterService } from './cutter.service';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Controller('cutter')
export class CutterController {
    constructor(private readonly cutterService: CutterService) { }

    @Post()
    async cut(@Body() body: { url: string; start: string; end: string }) {
        const id = randomUUID();
        const cutPath = path.join(process.cwd(), 'tmp', `${id}_cut.mp4`);
        const urlPath = `/videos/${id}_cut.mp4`;

        this.cutterService
            .downloadAndCut(body.url, body.start, body.end, cutPath, (step, message) => {
                console.log(`[${step}] ${message}`);
            })
            .then(() => console.log(`✅ Selesai: ${cutPath}`))
            .catch((err) => console.error(`❌ Gagal: ${err.message}`));

        return {
            message: '🚀 Proses sedang berjalan...',
            file: cutPath,
            url: urlPath,
        };
    }
}
