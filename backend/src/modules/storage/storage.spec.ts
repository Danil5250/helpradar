import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { loadAppConfig } from '../../config/app.config';
import { LocalFileStorage } from './file-storage';
import { S3FileStorage } from './S3FileStorage';
import { SignedUrlService } from './signed-url.service';
import {
  ImageSanitizerService,
  MAX_PHOTO_BYTES,
  MAX_AVATAR_BYTES,
} from './image-sanitizer.service';

describe('Signed file URLs', () => {
  const service = new SignedUrlService(
    loadAppConfig({ FILE_URL_SECRET: 'test-signing-secret' }),
  );
  const key = `${randomUUID()}.png`;
  it('binds a signature to its key and expiration', () => {
    const url = new URL(service.sign(key, 60, 1000), 'http://localhost');
    const expires = url.searchParams.get('expires')!;
    const signature = url.searchParams.get('signature')!;
    expect(service.verify(key, expires, signature, 60999)).toBe(true);
    expect(service.verify(key, expires, signature, 61001)).toBe(false);
    expect(
      service.verify(`${randomUUID()}.png`, expires, signature, 1000),
    ).toBe(false);
    expect(service.verify(key, 'invalid', signature, 1000)).toBe(false);
    expect(service.verify(key, expires, 'short', 1000)).toBe(false);
    expect(service.verify(key, expires, undefined, 1000)).toBe(false);
    expect(service.resolve('/placeholder.png')).toBe('/placeholder.png');
    expect(service.resolve(key)).toContain(`/api/files/${key}?`);
  });
});

describe('Local file storage', () => {
  let directory: string;
  let storage: LocalFileStorage;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'helpradar-storage-'));
    storage = new LocalFileStorage(directory);
  });
  afterEach(async () => {
    if (!directory.startsWith(join(tmpdir(), 'helpradar-storage-')))
      throw new Error('Unexpected temporary directory');
    await rm(directory, { recursive: true, force: true });
  });
  it('round-trips bytes and handles missing files and repeated deletion', async () => {
    const key = `${randomUUID()}.png`;
    const bytes = Buffer.from('image');
    expect(await storage.read(key)).toBeNull();
    await storage.put(key, bytes);
    expect(await storage.read(key)).toEqual(bytes);
    await storage.delete(key);
    await storage.delete(key);
    expect(await storage.read(key)).toBeNull();
  });
  it.each(['../outside.png', 'nested/file.png', 'bad.svg', 'C:\\outside.png'])(
    'rejects unsafe keys: %s',
    async (key) => {
      await expect(storage.put(key, Buffer.from('x'))).rejects.toThrow(
        'Invalid storage key',
      );
      await expect(storage.read(key)).rejects.toThrow('Invalid storage key');
      await expect(storage.delete(key)).rejects.toThrow('Invalid storage key');
    },
  );
});

describe('S3 storage adapter', () => {
  let send: jest.Mock;
  let storage: S3FileStorage;
  const key = `${randomUUID()}.webp`;
  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send') as unknown as jest.Mock;
    send.mockResolvedValue({});
    storage = new S3FileStorage('eu-north-1', 'test', 'test', 'test-bucket');
  });
  it('uses the configured bucket for upload, read and delete', async () => {
    const bytes = Buffer.from('image');
    await storage.put(key, bytes);
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-bucket',
      Key: key,
      Body: bytes,
    });
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array(bytes) },
    });
    expect(await storage.read(key)).toEqual(bytes);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    await storage.delete(key);
    expect(send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
  });
  it('maps missing objects to null but preserves infrastructure failures', async () => {
    send
      .mockRejectedValueOnce({ name: 'NoSuchKey' })
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({});
    expect(await storage.read(key)).toBeNull();
    expect(await storage.read(key)).toBeNull();
    expect(await storage.read(key)).toBeNull();
    send.mockRejectedValueOnce(new Error('denied'));
    await expect(storage.read(key)).rejects.toThrow('denied');
    await expect(storage.put('../bad', Buffer.from('x'))).rejects.toThrow(
      'Invalid storage key',
    );
    await expect(storage.read('bad')).rejects.toThrow('Invalid storage key');
    await expect(storage.delete('bad')).rejects.toThrow('Invalid storage key');
  });
});

describe('Image sanitizer', () => {
  const service = new ImageSanitizerService();
  it.each(['jpeg', 'png', 'webp'] as const)(
    're-encodes %s and removes metadata',
    async (format) => {
      const bytes = await sharp({
        create: { width: 640, height: 320, channels: 3, background: 'red' },
      })
        .toFormat(format)
        .withMetadata()
        .toBuffer();
      const result = await service.sanitize(bytes);
      const metadata = await sharp(result.data).metadata();
      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(320);
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(result.contentType).toBe(`image/${format}`);
      const avatar = await service.sanitizeAvatar(bytes);
      expect(await sharp(avatar.data).metadata()).toMatchObject({
        width: 256,
        height: 256,
      });
    },
  );
  it('bounds large images without enlarging small ones', async () => {
    const bytes = await sharp({
      create: { width: 3000, height: 100, channels: 3, background: 'blue' },
    })
      .png()
      .toBuffer();
    const result = await service.sanitize(bytes);
    expect((await sharp(result.data).metadata()).width).toBe(2560);
  });
  it('rejects empty, corrupt, unsupported and oversized uploads', async () => {
    for (const bytes of [
      Buffer.alloc(0),
      Buffer.from('not an image'),
      Buffer.from('<svg width="1" height="1"></svg>'),
      Buffer.alloc(MAX_PHOTO_BYTES + 1),
    ]) {
      await expect(service.sanitize(bytes)).rejects.toMatchObject({
        code: 'PHOTO_INVALID',
      });
    }
    await expect(
      service.sanitizeAvatar(Buffer.alloc(MAX_AVATAR_BYTES + 1)),
    ).rejects.toMatchObject({ code: 'AVATAR_INVALID' });
  });
});
