import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

type ProgressCallback = (step: string, message: string) => void;

enum ProgressStep {
  VIDEO = 'download:video',
  AUDIO = 'download:audio',
  MERGE = 'merge',
  CUT = 'cut',
}

@Injectable()
export class CutterService {
  async downloadAndCut(
    url: string,
    start: string,
    end: string,
    cutPath: string,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    const id = randomUUID();
    const rawVideoPath = path.join(tmpDir, `${id}_video.mp4`);
    const rawAudioPath = path.join(tmpDir, `${id}_audio.m4a`);
    const mergedPath = path.join(tmpDir, `${id}_merged.mp4`);

    // Step 1: Get formats
    const formatList = await this.getAvailableFormats(url);
    const videoFormat = this.getBestVideoFormat(formatList);
    const audioFormat = this.getBestAudioFormat(formatList) ?? 'bestaudio';

    if (!videoFormat) {
      throw new Error('🚫 Tidak ada format video yang cocok. Coba video lain.');
    }

    // Step 2: Download video-only
    await this.spawnWithProgress(
      'yt-dlp',
      ['-f', videoFormat, '-o', rawVideoPath, url],
      ProgressStep.VIDEO,
      onProgress
    );

    // Step 3: Download audio-only
    let audioExists = false;
    try {
      await this.spawnWithProgress(
        'yt-dlp',
        [
          '-f', audioFormat,
          '-o', rawAudioPath,
          '--extract-audio',
          '--audio-format', 'm4a',
          '--audio-quality', '0',
          url,
        ],
        ProgressStep.AUDIO,
        onProgress
      );
      audioExists = fs.existsSync(rawAudioPath) && fs.statSync(rawAudioPath).size > 1000;
    } catch (err) {
      console.warn('⚠️ Gagal mendownload audio. Video akan diproses tanpa suara.');
    }

    // Step 4: Merge
    if (audioExists) {
      await this.spawnWithProgress(
        'ffmpeg',
        [
          '-i', rawVideoPath,
          '-i', rawAudioPath,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-movflags', 'faststart',
          mergedPath,
        ],
        ProgressStep.MERGE,
        onProgress
      );
    } else {
      fs.renameSync(rawVideoPath, mergedPath);
      onProgress?.(ProgressStep.MERGE, '⚠️ Video-only. Tidak mengandung audio.');
    }

    // Step 5: Cut
    await this.cutVideo(mergedPath, cutPath, start, end, onProgress);

    // Step 6: Cleanup
    this.cleanupTempFile(rawVideoPath);
    this.cleanupTempFile(rawAudioPath);
    this.cleanupTempFile(mergedPath);

    return `/videos/${path.basename(cutPath)}`;
  }

  private async getAvailableFormats(url: string): Promise<string[]> {
    return new Promise((resolve) => {
      const formats: string[] = [];
      const proc = spawn('yt-dlp', ['-F', url]);
      proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const match = line.match(/^(\d+)\s/);
          if (match) formats.push(match[1]);
        }
      });
      proc.on('close', () => resolve(formats));
      proc.on('error', () => resolve([]));
    });
  }

  private getBestVideoFormat(formats: string[]): string | null {
    const candidates = ['137', '311', '312', '22', '18', '233', '234'];
    return candidates.find((f) => formats.includes(f)) || null;
  }

  private getBestAudioFormat(formats: string[]): string | null {
    const candidates = ['140', '251', '250', '249'];
    return candidates.find((f) => formats.includes(f)) || null;
  }

  private async cutVideo(
    input: string,
    output: string,
    start: string,
    end: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const duration = this.calculateDuration(start, end);
    await this.spawnWithProgress(
      'ffmpeg',
      [
        '-ss', start,
        '-i', input,
        '-t', duration,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-movflags', 'faststart',
        output,
      ],
      ProgressStep.CUT,
      onProgress
    );
  }

  private cleanupTempFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private calculateDuration(start: string, end: string): string {
    const [sh, sm, ss] = start.split(':').map(Number);
    const [eh, em, es] = end.split(':').map(Number);
    const startSec = sh * 3600 + sm * 60 + ss;
    const endSec = eh * 3600 + em * 60 + es;
    return (endSec - startSec).toString();
  }

  private spawnWithProgress(
    cmd: string,
    args: string[],
    step: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args);
      child.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        console.log(`[${cmd} stdout]: ${msg}`);
        onProgress?.(step, msg);
      });
      child.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        console.log(`[${cmd} stderr]: ${msg}`);
        onProgress?.(step, msg);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${cmd} exited with code ${code}`));
      });
    });
  }
}
