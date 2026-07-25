import { describe, expect, it } from "vitest";
import { getR2StorageConfig, R2ConfigurationError } from "./r2";

describe("R2 storage configuration", () => {
  it("returns a complete private-bucket configuration", () => {
    expect(
      getR2StorageConfig({
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "bucket",
      }),
    ).toEqual({
      accountId: "account",
      accessKeyId: "access",
      secretAccessKey: "secret",
      bucket: "bucket",
    });
  });

  it("rejects partial configurations", () => {
    expect(
      getR2StorageConfig({
        R2_ACCOUNT_ID: "account",
        R2_BUCKET: "bucket",
      }),
    ).toBeUndefined();
  });

  it("uses a stable configuration error without exposing values", () => {
    const error = new R2ConfigurationError();
    expect(error.name).toBe("R2ConfigurationError");
    expect(error.message).toContain("R2_ACCESS_KEY_ID");
    expect(error.message).not.toContain("secret-value");
  });
});
