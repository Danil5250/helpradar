import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { FileStorage, STORAGE_KEY_REGEX } from './file-storage';

export class S3FileStorage extends FileStorage {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    bucket: string,
  ) {
    super();
    this.bucket = bucket;
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async put(key: string, data: Buffer): Promise<void> {
    this.validateKey(key);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
      }),
    );
  }

  async read(key: string): Promise<Buffer | null> {
    this.validateKey(key);
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      
      const byteArray = await response.Body?.transformToByteArray();
      return byteArray ? Buffer.from(byteArray) : null;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    this.validateKey(key);
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private validateKey(key: string): void {
    if (!STORAGE_KEY_REGEX.test(key)) {
      throw new Error('Invalid storage key');
    }
  }
}
