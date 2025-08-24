import { describe, expect, it, vi } from "vitest";

const MAX_AGE = 60 * 60 * 24 * 365;

let mockSet: ReturnType<typeof vi.fn> | undefined;

async function withNodeEnv<T>(env: string, fn: () => Promise<T>) {
  const original = process.env.NODE_ENV;
  try {
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: env },
      writable: true,
    });
    return await fn();
  } finally {
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: original },
      writable: true,
    });
  }
}

describe("setTheme server action", () => {
  it("sets theme cookie with correct options in non-production", async () => {
    vi.resetModules();
    mockSet = vi.fn();
    vi.mock("next/headers", () => ({
      cookies: vi.fn(async () => ({ set: mockSet })),
    }));

    const { setTheme } = await import("./actions");

    await withNodeEnv("development", async () => {
      await setTheme("light");

      expect(mockSet).toHaveBeenCalledWith("theme", "light", {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: MAX_AGE,
      });
    });
    mockSet = undefined;
  });

  it("marks secure in production", async () => {
    vi.resetModules();
    mockSet = vi.fn();
    vi.mock("next/headers", () => ({
      cookies: vi.fn(async () => ({ set: mockSet })),
    }));

    const { setTheme } = await import("./actions");

    await withNodeEnv("production", async () => {
      await setTheme("dark");

      expect(mockSet).toHaveBeenCalledWith("theme", "dark", {
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: MAX_AGE,
      });
    });
    mockSet = undefined;
  });
});
