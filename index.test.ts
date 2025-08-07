import { describe, expect, it, vi } from "vitest";

describe("index.ts", () => {
  it("should log 'Hello via Bun!'", async () => {
    const logSpy = vi.spyOn(console, "log");

    await import("./index");

    expect(logSpy).toHaveBeenCalledWith("Hello via Bun!");
    logSpy.mockRestore();
  });
});
