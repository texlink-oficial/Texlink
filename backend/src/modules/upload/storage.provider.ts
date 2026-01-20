import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

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
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
    private readonly uploadDir = join(process.cwd(), '..', 'uploads');
    private readonly baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    async upload(file: UploadedFile, folder = 'attachments'): Promise<StorageResult> {
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
}

// S3 implementation placeholder - ready for future use
@Injectable()
export class S3StorageProvider implements StorageProvider {
    // private readonly s3: S3Client;
    // private readonly bucket: string;

    async upload(file: UploadedFile, folder = 'attachments'): Promise<StorageResult> {
        // TODO: Implement S3 upload
        // const key = `${folder}/${uuid()}.${ext}`;
        // await this.s3.send(new PutObjectCommand({ ... }));
        throw new Error('S3 storage not configured. Set USE_S3=true and provide credentials.');
    }

    async delete(key: string): Promise<void> {
        // TODO: Implement S3 delete
        throw new Error('S3 storage not configured.');
    }

    getUrl(key: string): string {
        // TODO: Return CloudFront or S3 URL
        return '';
    }
}
