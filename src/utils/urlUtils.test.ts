import { vi } from "vitest";

import { getEnvironmentDependentUrl } from "./urlUtils";

describe("getEnvironmentDependentUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { ...window.location } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the correct URL for production environment", () => {
    vi.stubEnv("VITE_ENV", "production");
    vi.stubGlobal("window", {
      location: { origin: "https://amalv.github.io" },
    });

    const url = getEnvironmentDependentUrl();

    expect(url).toBe("https://amalv.github.io/bukie");
  });

  it("returns the correct URL for non-production environment", () => {
    vi.stubEnv("VITE_ENV", "development");
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

    const url = getEnvironmentDependentUrl();

    expect(url).toBe("http://localhost:3000");
  });
});
