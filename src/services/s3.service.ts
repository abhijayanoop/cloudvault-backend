import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from '../config/environment';
import logger from '../config/logger';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucketName = config.aws.s3BucketName;

    logger.info('AWS S3 initialized', {
      region: config.aws.region,
      bucket: this.bucketName,
    });
  }

  getBucketName() {
    return this.bucketName;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<any> {
    try {
      const command = new PutObjectCommand({
        Key: key,
        Body: buffer,
        Bucket: this.bucketName,
        ContentType: mimeType,
      });

      const result = await this.s3Client.send(command);
      logger.info('File uploaded to S3:', {
        key,
        mimeType,
        size: buffer.length,
      });
      return result;
    } catch (error) {
      logger.error('Error uploading file to S3', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.debug('Generated presigned download URL:', { key, expiresIn });

      return url;
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 900
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Key: key,
        Bucket: this.bucketName,
        ContentType: mimeType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      logger.debug('Generated presigned url for upload', {
        key,
        expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async deleteFile(key: string): Promise<any> {
    try {
      const command = new DeleteObjectCommand({
        Key: key,
        Bucket: this.bucketName,
      });

      const result = await this.s3Client.send(command);

      logger.info('File deleted from S3:', { key });

      return result;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async deleteMultipleFiles(keys: string[]): Promise<any> {
    try {
      if (keys.length === 0) return;

      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      const result = await this.s3Client.send(command);

      logger.info('Multiple files deleted from S3:', { count: keys.length });

      return result;
    } catch (error) {
      logger.error('S3 batch delete error:', error);
      throw new Error('Failed to delete files from S3');
    }
  }

  async checkFileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Key: key,
        Bucket: this.bucketName,
      });

      await this.s3Client.send(command);

      return true;
    } catch (error: any) {
      if (error.name === 'Not found') {
        return false;
      }
      throw error;
    }
  }

  generateUniqueKey(workspaceId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const ext = path.extname(originalFilename);
    const nameWithoutExt = path.basename(originalFilename, ext);

    // Sanitize filename
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);

    return `${workspaceId}/${timestamp}-${uuid}-${sanitizedName}${ext}`;
  }
}

export const s3Service = new S3Service();
