import { describe, expect, it, vi } from "vitest";

const MAX_AGE = 60 * 60 * 24 * 365;

let mockSet: ReturnType<typeof vi.fn> | undefined;

describe("setTheme server action", () => {
  it("sets theme cookie with correct options in non-production", async () => {
    vi.resetModules();
    mockSet = vi.fn();
    vi.mock("next/headers", () => ({
      cookies: vi.fn(async () => ({ set: mockSet })),
    }));

    const { setTheme } = await import("./actions");

    // ensure NODE_ENV is not production
    const original = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "development" },
      writable: true,
    });

    await setTheme("light");

    expect(mockSet).toHaveBeenCalledWith("theme", "light", {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: MAX_AGE,
    });
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: original },
      writable: true,
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

    const original2 = process.env.NODE_ENV;
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: "production" },
      writable: true,
    });

    await setTheme("dark");

    expect(mockSet).toHaveBeenCalledWith("theme", "dark", {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: MAX_AGE,
    });
    Object.defineProperty(process, "env", {
      value: { ...process.env, NODE_ENV: original2 },
      writable: true,
    });
    mockSet = undefined;
  });
});
