import { describe, expect, it } from "vitest";
import {
  chooseIsbn,
  isValidIsbn10,
  isValidIsbn13,
  normalizeAuthor,
  normalizeIsbn,
} from "./validate";

describe("normalizeIsbn", () => {
  it("keeps digits and X and uppercases", () => {
    const out = normalizeIsbn(" 978-0-13-475759-9 ");
    expect(out).toBe("9780134757599");
  });
});

describe("isValidIsbn10", () => {
  it("validates a correct ISBN-10", () => {
    const ok = isValidIsbn10("0306406152");
    expect(ok).toBe(true);
  });
  it("rejects an invalid ISBN-10", () => {
    const ok = isValidIsbn10("0306406153");
    expect(ok).toBe(false);
  });
});

describe("isValidIsbn13", () => {
  it("validates a correct ISBN-13", () => {
    const ok = isValidIsbn13("9780306406157");
    expect(ok).toBe(true);
  });
  it("rejects an invalid ISBN-13", () => {
    const ok = isValidIsbn13("9780306406158");
    expect(ok).toBe(false);
  });
});

describe("chooseIsbn", () => {
  it("prefers isbn13 when available", () => {
    const out = chooseIsbn("9780306406157", "0306406152", null);
    expect(out).toBe("9780306406157");
  });
  it("falls back to isbn10, then free-form", () => {
    const a = chooseIsbn(null, "0306406152", null);
    const b = chooseIsbn(null, null, "978-0-306-40615-7");
    expect(a).toBe("0306406152");
    expect(b).toBe("9780306406157");
  });
});

describe("normalizeAuthor", () => {
  it("joins arrays with & or comma rules", () => {
    const one = normalizeAuthor(["Jane Austen"]);
    const two = normalizeAuthor(["Neil Gaiman", "Terry Pratchett"]);
    const many = normalizeAuthor(["A", "B", "C"]);
    expect(one).toBe("Jane Austen");
    expect(two).toBe("Neil Gaiman & Terry Pratchett");
    expect(many).toBe("A, B, C");
  });
});
