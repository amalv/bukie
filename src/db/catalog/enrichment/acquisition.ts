import { sha256 } from "../identity";
import type { CatalogFieldKey } from "../values";
import { assertAdapterEnabled, authorizeField } from "./policies";
import type { AdapterManifest, EnrichmentFieldClass } from "./types";

const SENSITIVE_KEY =
  /authorization|cookie|credential|password|secret|token|api[-_]?key/i;

export type AcquisitionRequest = {
  url: string;
  fieldClass: EnrichmentFieldClass;
  fieldKey: CatalogFieldKey;
  headers?: Readonly<Record<string, string>>;
  cacheKey?: string;
};

export type AcquisitionResponse = {
  status: number;
  headers: Readonly<Record<string, string | undefined>>;
  body: string;
  latencyMs: number;
};

export type CachedResponse = AcquisitionResponse & {
  etag?: string;
  lastModified?: string;
};

export type AcquisitionResult = {
  response: AcquisitionResponse;
  cacheHit: boolean;
  conditionalHit: boolean;
  retries: number;
  throttled: boolean;
  retryAfterMs: number;
  responseBytes: number;
};

export type AcquisitionDependencies = {
  transport: (request: AcquisitionRequest) => Promise<AcquisitionResponse>;
  cache?: {
    get(key: string): Promise<CachedResponse | undefined>;
    set(key: string, response: CachedResponse): Promise<void>;
  };
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  credentials?: Readonly<Record<string, string | undefined>>;
};

export class AcquisitionError extends Error {
  readonly code:
    | "adapter_disabled"
    | "credentials_missing"
    | "host_not_allowed"
    | "retry_exhausted"
    | "terminal_failure";

  constructor(code: AcquisitionError["code"], message: string) {
    super(message);
    this.name = "AcquisitionError";
    this.code = code;
  }
}

export function sanitizeDiagnostic(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDiagnostic);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeDiagnostic(entry),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]")
    .replace(
      /\b(api[-_]?key|password|secret|token)=([^&\s]+)/gi,
      "$1=[REDACTED]",
    );
}

function header(
  headers: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return entry?.[1];
}

function parseRetryAfter(raw: string | undefined, now: number): number | null {
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}

function assertCredentials(
  adapter: AdapterManifest,
  credentials: AcquisitionDependencies["credentials"],
) {
  const missing = adapter.acquisition.credentials.filter(
    (key) => !credentials?.[key],
  );
  if (missing.length) {
    throw new AcquisitionError(
      "credentials_missing",
      `Acquisition refused: required credentials are missing for ${adapter.adapterId}`,
    );
  }
}

export async function acquireRecord(input: {
  adapter: AdapterManifest;
  request: AcquisitionRequest;
  dependencies: AcquisitionDependencies;
}): Promise<AcquisitionResult> {
  const { adapter, request, dependencies } = input;
  try {
    assertAdapterEnabled(adapter);
  } catch {
    throw new AcquisitionError(
      "adapter_disabled",
      `Acquisition refused: ${adapter.adapterId} is not enabled`,
    );
  }
  assertCredentials(adapter, dependencies.credentials);
  const permission = authorizeField({
    adapter,
    fieldClass: request.fieldClass,
    fieldKey: request.fieldKey,
  });
  if (adapter.acquisition.method === "disabled") {
    throw new AcquisitionError(
      "adapter_disabled",
      `Acquisition refused: ${adapter.adapterId} has no approved acquisition method`,
    );
  }
  if (adapter.acquisition.host) {
    let requestHost: string;
    try {
      requestHost = new URL(request.url).hostname;
    } catch {
      throw new AcquisitionError(
        "host_not_allowed",
        `Acquisition refused: ${adapter.adapterId} received an invalid URL`,
      );
    }
    if (requestHost !== adapter.acquisition.host) {
      throw new AcquisitionError(
        "host_not_allowed",
        `Acquisition refused: ${adapter.adapterId} may access only its declared host`,
      );
    }
  }

  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const now = dependencies.now ?? Date.now;
  const random = dependencies.random ?? Math.random;
  const cacheKey = request.cacheKey ?? sha256(request.url);
  const cacheAllowed = adapter.acquisition.cache && permission.cache;
  const cached =
    cacheAllowed && dependencies.cache
      ? await dependencies.cache.get(cacheKey)
      : undefined;
  const requestHeaders: Record<string, string> = { ...request.headers };
  if (
    cached &&
    adapter.acquisition.conditionalRetrieval === "etag_and_last_modified"
  ) {
    if (cached.etag) requestHeaders["If-None-Match"] = cached.etag;
    if (cached.lastModified) {
      requestHeaders["If-Modified-Since"] = cached.lastModified;
    }
  } else if (
    cached &&
    adapter.acquisition.conditionalRetrieval === "snapshot"
  ) {
    return {
      response: cached,
      cacheHit: true,
      conditionalHit: false,
      retries: 0,
      throttled: false,
      retryAfterMs: 0,
      responseBytes: Buffer.byteLength(cached.body),
    };
  }

  let retries = 0;
  let throttled = false;
  let retryAfterMs = 0;
  while (true) {
    const response = await dependencies.transport({
      ...request,
      headers: requestHeaders,
    });
    if (response.status === 304 && cached) {
      return {
        response: cached,
        cacheHit: true,
        conditionalHit: true,
        retries,
        throttled,
        retryAfterMs,
        responseBytes: 0,
      };
    }
    if (response.status >= 200 && response.status < 300) {
      const stored: CachedResponse = {
        ...response,
        etag: header(response.headers, "etag"),
        lastModified: header(response.headers, "last-modified"),
      };
      if (cacheAllowed && dependencies.cache) {
        await dependencies.cache.set(cacheKey, stored);
      }
      return {
        response,
        cacheHit: false,
        conditionalHit: false,
        retries,
        throttled,
        retryAfterMs,
        responseBytes: Buffer.byteLength(response.body),
      };
    }
    if (!retryableStatus(response.status)) {
      throw new AcquisitionError(
        "terminal_failure",
        `Provider request failed with terminal ${statusClass(response.status)} response`,
      );
    }
    if (retries >= adapter.acquisition.retry.ceiling) {
      throw new AcquisitionError(
        "retry_exhausted",
        `Provider request exhausted the retry ceiling after ${retries} retries`,
      );
    }
    const retryNumber = retries;
    retries += 1;
    if (response.status === 429) throttled = true;
    const providerDelay = adapter.acquisition.retry.respectRetryAfter
      ? parseRetryAfter(header(response.headers, "retry-after"), now())
      : null;
    const exponential = Math.min(
      adapter.acquisition.retry.maximumDelayMs,
      adapter.acquisition.retry.baseDelayMs * 2 ** retryNumber,
    );
    const jitter =
      exponential * adapter.acquisition.retry.jitterRatio * random();
    const delay = Math.max(providerDelay ?? 0, exponential + jitter);
    retryAfterMs += providerDelay ?? 0;
    await sleep(delay);
  }
}

export async function acquireRecords(input: {
  adapter: AdapterManifest;
  requests: readonly AcquisitionRequest[];
  dependencies: AcquisitionDependencies;
}): Promise<AcquisitionResult[]> {
  const { adapter, requests, dependencies } = input;
  assertAdapterEnabled(adapter);
  const concurrency = adapter.acquisition.perHostConcurrency;
  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const now = dependencies.now ?? Date.now;
  let nextIndex = 0;
  let nextStartAt = 0;
  const results = new Array<AcquisitionResult>(requests.length);

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const request = requests[index];
      if (!request) return;
      const reservedStart = Math.max(now(), nextStartAt);
      nextStartAt = reservedStart + adapter.acquisition.minimumIntervalMs;
      const delay = reservedStart - now();
      if (delay > 0) await sleep(delay);
      results[index] = await acquireRecord({
        adapter,
        request,
        dependencies: { ...dependencies, sleep, now },
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests.length) }, () =>
      worker(),
    ),
  );
  return results;
}
