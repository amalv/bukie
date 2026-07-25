import {
  GetObjectCommand,
  NoSuchKey,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { MediaEnvironment } from "./config";

export type R2StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export type R2Object = {
  body: Uint8Array;
  cacheControl?: string;
  contentLength?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
};

export class R2ConfigurationError extends Error {
  constructor() {
    super(
      "R2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET",
    );
    this.name = "R2ConfigurationError";
  }
}

let cachedClient:
  | {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      client: S3Client;
    }
  | undefined;

function readRequiredEnv(
  name: keyof NodeJS.ProcessEnv,
  env: MediaEnvironment,
): string | undefined {
  const value = env[name]?.trim();
  return value || undefined;
}

export function getR2StorageConfig(
  env: MediaEnvironment = process.env,
): R2StorageConfig | undefined {
  const accountId = readRequiredEnv("R2_ACCOUNT_ID", env);
  const accessKeyId = readRequiredEnv("R2_ACCESS_KEY_ID", env);
  const secretAccessKey = readRequiredEnv("R2_SECRET_ACCESS_KEY", env);
  const bucket = readRequiredEnv("R2_BUCKET", env);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return undefined;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client(config: R2StorageConfig): S3Client {
  if (
    cachedClient?.accountId === config.accountId &&
    cachedClient.accessKeyId === config.accessKeyId &&
    cachedClient.secretAccessKey === config.secretAccessKey
  ) {
    return cachedClient.client;
  }

  const clientConfig: S3ClientConfig = {
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    maxAttempts: 2,
  };
  const client = new S3Client(clientConfig);
  cachedClient = {
    accountId: config.accountId,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    client,
  };
  return client;
}

function isMissingObject(error: unknown): boolean {
  if (error instanceof NoSuchKey) return true;
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    name?: string;
  };
  return candidate.name === "NoSuchKey" || candidate.name === "NotFound";
}

export async function readR2Object(
  key: string,
  env: MediaEnvironment = process.env,
): Promise<R2Object | undefined> {
  const config = getR2StorageConfig(env);
  if (!config) throw new R2ConfigurationError();

  try {
    const object = await getR2Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
    if (!object.Body) return undefined;

    return {
      body: await object.Body.transformToByteArray(),
      cacheControl: object.CacheControl,
      contentLength: object.ContentLength,
      contentType: object.ContentType,
      etag: object.ETag,
      lastModified: object.LastModified,
    };
  } catch (error) {
    if (isMissingObject(error)) {
      const details =
        error && typeof error === "object"
          ? (error as {
              name?: string;
              message?: string;
              $metadata?: { httpStatusCode?: number };
            })
          : undefined;
      console.warn("R2 object was not found", {
        accountId: config.accountId,
        bucket: config.bucket,
        key,
        errorName: details?.name,
        errorMessage: details?.message,
        httpStatusCode: details?.$metadata?.httpStatusCode,
      });
      return undefined;
    }
    throw error;
  }
}
