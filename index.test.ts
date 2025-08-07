import { describe, expect, it, vi } from "vitest";

describe("index.ts", () => {
  it("should log 'Hello via Bun!'", () => {
    const logSpy = vi.spyOn(console, "log");
    require("./index");
    expect(logSpy).toHaveBeenCalledWith("Hello via Bun!");
    logSpy.mockRestore();
  });
});
