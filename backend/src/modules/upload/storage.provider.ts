import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(file: UploadedFile, folder?: string): Promise<StorageResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  getPresignedUrl?(key: string, expiresIn?: number): Promise<string>;
  resolveUrl?(url: string | null | undefined, expiresIn?: number): Promise<string | null>;
}

// Token for dependency injection
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir = join(process.cwd(), '..', 'uploads');
  private readonly baseUrl =
    process.env.API_BASE_URL || 'http://localhost:3000';

  async upload(
    file: UploadedFile,
    folder = 'attachments',
  ): Promise<StorageResult> {
    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `${folder}/${uuid()}.${ext}`;
    const filePath = join(this.uploadDir, key);

    // Ensure directory exists
    await fs.mkdir(join(this.uploadDir, folder), { recursive: true });

    // Write file
    await fs.writeFile(filePath, file.buffer);

    return {
      url: `${this.baseUrl}/uploads/${key}`,
      key,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, ignore
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    // Local storage doesn't need presigned URLs, return direct URL
    return this.getUrl(key);
  }

  async resolveUrl(url: string | null | undefined, expiresIn = 3600): Promise<string | null> {
    if (!url) return null;
    return url;
  }
}

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cloudFrontDomain: string | undefined;
  private readonly region: string;
  private readonly logger = new Logger(S3StorageProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');
    this.cloudFrontDomain = this.configService.get<string>('CLOUDFRONT_DOMAIN');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });

    if (this.bucket) {
      this.logger.log(`S3 Storage configured: bucket=${this.bucket}, region=${this.region}`);
      if (this.cloudFrontDomain) {
        this.logger.log(`CloudFront CDN enabled: ${this.cloudFrontDomain}`);
      }
    }
  }

  async upload(
    file: UploadedFile,
    folder = 'attachments',
  ): Promise<StorageResult> {
    if (!this.bucket) {
      throw new Error(
        'S3 storage not configured. Set AWS_S3_BUCKET environment variable.',
      );
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `${folder}/${uuid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'max-age=31536000', // 1 year cache
      ContentDisposition: `inline; filename="${encodeURIComponent(file.originalname)}"`,
    });

    try {
      await this.s3.send(command);
      this.logger.log(`File uploaded to S3: ${key}`);

      return {
        url: this.getUrl(key),
        key,
      };
    } catch (error) {
      this.logger.error(`S3 upload failed: ${error.message}`);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.bucket) {
      this.logger.warn('S3 storage not configured, skipping delete');
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.warn(`S3 delete failed (may not exist): ${error.message}`);
    }
  }

  getUrl(key: string): string {
    // Use CloudFront if configured, otherwise direct S3 URL
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.bucket) {
      throw new Error('S3 storage not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn, // Default 1 hour
    });

    return presignedUrl;
  }

  async resolveUrl(url: string | null | undefined, expiresIn = 3600): Promise<string | null> {
    if (!url) return null;

    // Extract key from S3 URL or CloudFront URL
    const key = this.extractKeyFromUrl(url);
    if (!key) return url;

    return this.getPresignedUrl(key, expiresIn);
  }

  private extractKeyFromUrl(url: string): string | null {
    // S3: https://bucket.s3.region.amazonaws.com/key
    const s3Match = url.match(/^https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/);
    if (s3Match) return s3Match[1];

    // CloudFront: https://domain/key
    if (this.cloudFrontDomain && url.includes(this.cloudFrontDomain)) {
      const cfMatch = url.match(/^https?:\/\/[^/]+\/(.+)$/);
      if (cfMatch) return cfMatch[1];
    }

    // Local: http://localhost:3000/uploads/key
    const localMatch = url.match(/\/uploads\/(.+)$/);
    if (localMatch) return localMatch[1];

    return null;
  }

  /**
   * Generate a presigned URL for direct upload from client
   * Useful for large files to avoid server memory usage
   */
  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!this.bucket) {
      throw new Error('S3 storage not configured');
    }

    const ext = filename.split('.').pop() || 'bin';
    const key = `${folder}/${uuid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn,
    });

    return { uploadUrl, key };
  }
}
