import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage.service';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalStorageStrategy implements StorageService {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'apps/backend/api/public/uploads');
    this.baseUrl = '/uploads';

    if (!fs.existsSync(this.uploadDir)) {
      this.logger.log(`Creating upload directory: ${this.uploadDir}`);
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<string> {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const fullPath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(fullPath, file.buffer);
    this.logger.log(`File saved to ${fullPath}`);

    return `${this.baseUrl}/${filename}`;
  }

  async delete(filePath: string): Promise<void> {
    try {
      const filename = path.basename(filePath);
      const fullPath = path.join(this.uploadDir, filename);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }

  getUrl(filePath: string): string {
    return filePath;
  }
}
