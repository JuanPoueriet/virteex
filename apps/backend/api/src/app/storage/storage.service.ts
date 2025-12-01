
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export interface UploadedFile {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StoredFile {
  storageKey: string;
  fileSize: number;
  url?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.logger.log(`StorageService inicializado para el bucket S3: ${this.bucketName}`);
  }

  async upload(file: UploadedFile, organizationId: string): Promise<StoredFile> {
    const fileExtension = file.fileName.split('.').pop();
    const storageKey = `${organizationId}/${uuidv4()}.${fileExtension}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimeType,
      ContentLength: file.buffer.length,
    });

    await this.s3Client.send(command);
    
    this.logger.log(`Archivo subido a S3 con la clave: ${storageKey}`);
    return { storageKey, fileSize: file.buffer.length };
  }

  async getSignedUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
      const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getStream(storageKey: string): Promise<{ stream: Readable; fileSize: number; mimeType: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
        throw new Error('No se encontró el cuerpo del archivo en la respuesta de S3.');
    }

    return {
      stream: response.Body as Readable,
      fileSize: response.ContentLength || 0,
      mimeType: response.ContentType || 'application/octet-stream',
    };
  }

  async delete(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.s3Client.send(command);
    this.logger.log(`Archivo eliminado de S3 con la clave: ${storageKey}`);
  }
}