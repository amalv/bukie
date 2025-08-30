import { describe, expect, it } from "vitest";
import { getSectionHeader } from "./sectionHeader";

describe("getSectionHeader", () => {
  it("returns the correct header for 'top' section", () => {
    const header = getSectionHeader("top");
    expect(header.title).toBe("Top Rated");
  });

  it("returns the correct header for 'trending' section", () => {
    const header = getSectionHeader("trending");
    expect(header.title).toBe("Trending Now");
  });

  it("returns the correct header for 'new' section", () => {
    const header = getSectionHeader("new");
    expect(header.title).toBe("New Arrivals");
  });
});
