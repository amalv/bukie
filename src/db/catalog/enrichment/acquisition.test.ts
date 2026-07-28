import { describe, expect, it } from "vitest";
import {
  type AcquisitionResponse,
  acquireRecord,
  acquireRecords,
  sanitizeDiagnostic,
} from "./acquisition";
import { PENDING_ADAPTERS, WIKIDATA_WORK_FACTS_ADAPTER } from "./policies";

const okResponse = (
  overrides: Partial<AcquisitionResponse> = {},
): AcquisitionResponse => ({
  status: 200,
  headers: {},
  body: '{"ok":true}',
  latencyMs: 5,
  ...overrides,
});

const wikidataRequest = (url: string) => ({
  url,
  fieldClass: "metadata" as const,
  fieldKey: "work.preferred_title" as const,
});

describe("provider-neutral acquisition resilience", () => {
  it("honors Retry-After, exponential backoff, jitter configuration, and retry ceiling", async () => {
    const responses = [
      okResponse({
        status: 429,
        headers: { "Retry-After": "2" },
        body: "",
      }),
      okResponse({ status: 503, body: "" }),
      okResponse(),
    ];
    const sleeps: number[] = [];
    const result = await acquireRecord({
      adapter: WIKIDATA_WORK_FACTS_ADAPTER,
      request: wikidataRequest(
        "https://www.wikidata.org/wiki/Special:EntityData/Q1.json",
      ),
      dependencies: {
        transport: async () => responses.shift() ?? okResponse(),
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
        now: () => 0,
        random: () => 0.5,
      },
    });
    expect(result).toMatchObject({
      retries: 2,
      throttled: true,
      retryAfterMs: 2_000,
      responseBytes: Buffer.byteLength('{"ok":true}'),
    });
    expect(sleeps).toEqual([2_000, 2_200]);
  });

  it("uses conditional retrieval and returns the cached body on 304", async () => {
    const headers: Record<string, string> = {};
    const result = await acquireRecord({
      adapter: WIKIDATA_WORK_FACTS_ADAPTER,
      request: wikidataRequest(
        "https://www.wikidata.org/wiki/Special:EntityData/Q1.json",
      ),
      dependencies: {
        cache: {
          get: async () => ({
            ...okResponse({ body: '{"cached":true}' }),
            etag: '"fixture-etag"',
            lastModified: "Tue, 28 Jul 2026 12:00:00 GMT",
          }),
          set: async () => undefined,
        },
        transport: async (request) => {
          Object.assign(headers, request.headers);
          return okResponse({ status: 304, body: "" });
        },
      },
    });
    expect(headers).toMatchObject({
      "If-None-Match": '"fixture-etag"',
      "If-Modified-Since": "Tue, 28 Jul 2026 12:00:00 GMT",
    });
    expect(result).toMatchObject({
      cacheHit: true,
      conditionalHit: true,
      responseBytes: 0,
    });
    expect(result.response.body).toBe('{"cached":true}');
  });

  it("distinguishes terminal and retry-exhausted failures", async () => {
    await expect(
      acquireRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        request: wikidataRequest("https://www.wikidata.org/missing"),
        dependencies: {
          transport: async () => okResponse({ status: 404 }),
        },
      }),
    ).rejects.toMatchObject({
      code: "terminal_failure",
    });
    await expect(
      acquireRecord({
        adapter: {
          ...WIKIDATA_WORK_FACTS_ADAPTER,
          acquisition: {
            ...WIKIDATA_WORK_FACTS_ADAPTER.acquisition,
            retry: {
              ...WIKIDATA_WORK_FACTS_ADAPTER.acquisition.retry,
              ceiling: 1,
            },
          },
        },
        request: wikidataRequest("https://www.wikidata.org/unavailable"),
        dependencies: {
          transport: async () => okResponse({ status: 503 }),
          sleep: async () => undefined,
          random: () => 0,
        },
      }),
    ).rejects.toMatchObject({
      code: "retry_exhausted",
    });
  });

  it("fails closed for disablement and missing credentials", async () => {
    await expect(
      acquireRecord({
        adapter: PENDING_ADAPTERS[0],
        request: {
          url: "https://openlibrary.org/works/OL1W.json",
          fieldClass: "metadata",
          fieldKey: "work.preferred_title",
        },
        dependencies: { transport: async () => okResponse() },
      }),
    ).rejects.toMatchObject({
      code: "adapter_disabled",
    });
    await expect(
      acquireRecord({
        adapter: {
          ...WIKIDATA_WORK_FACTS_ADAPTER,
          acquisition: {
            ...WIKIDATA_WORK_FACTS_ADAPTER.acquisition,
            credentials: ["WIKIDATA_TOKEN"],
          },
        },
        request: wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q1.json",
        ),
        dependencies: { transport: async () => okResponse() },
      }),
    ).rejects.toMatchObject({
      code: "credentials_missing",
    });
  });

  it("fails closed for undeclared hosts and field-policy bypasses", async () => {
    await expect(
      acquireRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        request: wikidataRequest("https://example.com/Q190192"),
        dependencies: { transport: async () => okResponse() },
      }),
    ).rejects.toMatchObject({ code: "host_not_allowed" });
    await expect(
      acquireRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        request: {
          url: "https://www.wikidata.org/wiki/Special:EntityData/Q190192.json",
          fieldClass: "asset",
          fieldKey: "edition.covers",
        },
        dependencies: { transport: async () => okResponse() },
      }),
    ).rejects.toThrow("may not acquire asset field edition.covers");
  });

  it("applies per-host request intervals across a bounded batch", async () => {
    let clock = 0;
    const starts: number[] = [];
    const adapter = {
      ...WIKIDATA_WORK_FACTS_ADAPTER,
      acquisition: {
        ...WIKIDATA_WORK_FACTS_ADAPTER.acquisition,
        perHostConcurrency: 2,
        minimumIntervalMs: 10,
      },
    };
    const results = await acquireRecords({
      adapter,
      requests: [
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q1.json",
        ),
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q2.json",
        ),
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q3.json",
        ),
      ],
      dependencies: {
        now: () => clock,
        sleep: async (milliseconds) => {
          clock += milliseconds;
        },
        transport: async () => {
          starts.push(clock);
          return okResponse();
        },
      },
    });
    expect(results).toHaveLength(3);
    expect(starts).toEqual([0, 10, 20]);
  });

  it("never exceeds the declared per-host concurrency", async () => {
    let active = 0;
    let maximumActive = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let twoStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      twoStarted = resolve;
    });
    const adapter = {
      ...WIKIDATA_WORK_FACTS_ADAPTER,
      acquisition: {
        ...WIKIDATA_WORK_FACTS_ADAPTER.acquisition,
        perHostConcurrency: 2,
        minimumIntervalMs: 0,
      },
    };
    const pending = acquireRecords({
      adapter,
      requests: [
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q1.json",
        ),
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q2.json",
        ),
        wikidataRequest(
          "https://www.wikidata.org/wiki/Special:EntityData/Q3.json",
        ),
      ],
      dependencies: {
        transport: async () => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          if (active === 2) twoStarted();
          await gate;
          active -= 1;
          return okResponse();
        },
      },
    });
    await started;
    expect(maximumActive).toBe(2);
    release();
    await expect(pending).resolves.toHaveLength(3);
    expect(maximumActive).toBe(2);
  });

  it("redacts common secret-bearing fields and values", () => {
    expect(
      sanitizeDiagnostic({
        authorization: "Bearer super-secret",
        nested: {
          apiKey: "abc123",
          message: "token=abc123&status=failed",
        },
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        message: "token=[REDACTED]&status=failed",
      },
    });
  });
});
