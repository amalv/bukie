import { getEnvironmentDependentUrl } from "./urlUtils";

describe("getEnvironmentDependentUrl", () => {
  const originalWindowLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { ...originalWindowLocation };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the correct URL for production environment", () => {
    vi.stubEnv("VITE_ENV", "production");
    window.location.origin = "https://amalv.github.io";

    const url = getEnvironmentDependentUrl();

    expect(url).toBe("https://amalv.github.io/bukie");
  });

  it("returns the correct URL for non-production environment", () => {
    vi.stubEnv("VITE_ENV", "development");
    window.location.origin = "http://localhost:3000";

    const url = getEnvironmentDependentUrl();

    expect(url).toBe("http://localhost:3000");
  });
});
