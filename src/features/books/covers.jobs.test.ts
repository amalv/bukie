import { describe, expect, it, vi } from "vitest";
import { runCoverJobs } from "@/../scripts/covers/run-cover-jobs";

describe("cover job runner", () => {
  it("finishes the queue but rejects when any job fails", async () => {
    const processed: string[] = [];
    const onFailure = vi.fn();

    await expect(
      runCoverJobs(
        ["first", "broken", "last"],
        1,
        async (job) => {
          processed.push(job);
          if (job === "broken") throw new Error("Wrangler upload failed");
        },
        onFailure,
      ),
    ).rejects.toThrow("1 cover job(s) failed.");

    expect(processed).toEqual(["first", "broken", "last"]);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith("broken", expect.any(Error));
  });
});
