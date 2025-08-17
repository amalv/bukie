import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import { BookDetails } from "./BookDetails";

// Mock next/image to make the unoptimized prop observable in DOM
vi.mock("next/image", () => ({
  default: (props: {
    alt: string;
    src: string | { src: string };
    unoptimized?: boolean;
  }) => {
    const { alt, src, unoptimized } = props;
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return (
      <span
        role="img"
        aria-label={alt}
        data-src={resolvedSrc}
        data-test-unoptimized={String(Boolean(unoptimized))}
      />
    );
  },
}));

const wrap = (ui: React.ReactElement) => (
  <div className={lightThemeClass}>{ui}</div>
);

const base = {
  id: "x",
  title: "Test Title",
  author: "Test Author",
  cover: "/cover.jpg",
};

describe("BookDetails UI", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders title and author", () => {
    render(wrap(<BookDetails book={{ ...base }} />));

    expect(
      screen.getByRole("heading", { name: /test title/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/test author/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /back to library/i }),
    ).toBeInTheDocument();
  });

  it("shows genre badge when provided and hides when absent", () => {
    const { rerender } = render(
      wrap(<BookDetails book={{ ...base, genre: "Sci-Fi" }} />),
    );
    expect(screen.getAllByText("Sci-Fi").length).toBeGreaterThanOrEqual(1);

    rerender(wrap(<BookDetails book={{ ...base, genre: undefined }} />));
    expect(screen.queryByText("Sci-Fi")).not.toBeInTheDocument();
  });

  it("renders info row only when rating/year/pages exist", () => {
    // None present -> no ' pages' text in the meta info area
    render(wrap(<BookDetails book={{ ...base }} />));
    expect(screen.queryByText(/\d+ pages/i)).not.toBeInTheDocument();
  });

  it("renders rating with stars and sr-only text (half star)", () => {
    render(wrap(<BookDetails book={{ ...base, rating: 3.5 }} />));
    const sr = screen.getByText(/rating: 3\.5 out of 5/i);
    expect(sr.parentElement).not.toBeNull();
    const starWrap = sr.parentElement as HTMLElement; // span that wraps stars
    // 5 star paths rendered
    const starPaths = starWrap.querySelectorAll("path");
    expect(starPaths.length).toBe(5);
    // Half star uses gradient url fill
    const hasGradient = Array.from(starPaths).some((p) =>
      (p.getAttribute("fill") || "").startsWith("url("),
    );
    expect(hasGradient).toBe(true);
    // Numeric rating is visible alongside
    expect(screen.getByText("3.5")).toBeInTheDocument();
  });

  it("renders full and empty star fills at edges (0 and 1)", () => {
    let utils = render(wrap(<BookDetails book={{ ...base, rating: 0 }} />));
    let sr = screen.getByText(/rating: 0\.0 out of 5/i);
    expect(sr.parentElement).not.toBeNull();
    let starWrap = sr.parentElement as HTMLElement;
    let starPaths = starWrap.querySelectorAll("path");
    expect(starPaths.length).toBe(5);
    expect(starPaths[0].getAttribute("fill")).toBe("none");

    utils.unmount();
    utils = render(wrap(<BookDetails book={{ ...base, rating: 1 }} />));
    sr = screen.getByText(/rating: 1\.0 out of 5/i);
    expect(sr.parentElement).not.toBeNull();
    starWrap = sr.parentElement as HTMLElement;
    starPaths = starWrap.querySelectorAll("path");
    expect(starPaths.length).toBe(5);
    // At least one full star has currentColor fill
    expect(
      Array.from(starPaths).some(
        (p) => p.getAttribute("fill") === "currentColor",
      ),
    ).toBe(true);
  });

  it("shows year and pages (from mock when id=1)", () => {
    render(
      wrap(
        <BookDetails
          book={{
            id: "1",
            title: "Midnight Library",
            author: "Matt Haig",
            cover: "/a.jpg",
            year: 2020,
          }}
        />,
      ),
    );
    expect(screen.getAllByText("2020").length).toBeGreaterThanOrEqual(1);
    // pages info row text: "288 pages" (from mock)
    expect(screen.getByText(/288 pages/i)).toBeInTheDocument();
    // details grid shows Pages row
    expect(screen.getByText("Pages:")).toBeInTheDocument();
    expect(screen.getByText("288")).toBeInTheDocument();
  });

  it("renders About section with default fallback when no description or mock", () => {
    render(wrap(<BookDetails book={{ ...base, id: "no-mock" }} />));
    expect(
      screen.getByText(/full details for this book will be available soon/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Publisher:")).not.toBeInTheDocument();
    expect(screen.queryByText("ISBN:")).not.toBeInTheDocument();
  });

  it("renders About section from mock (id=1) and hides when description is empty string", () => {
    const { rerender } = render(
      wrap(
        <BookDetails
          book={{
            id: "1",
            title: "Midnight Library",
            author: "Matt Haig",
            cover: "/a.jpg",
          }}
        />,
      ),
    );
    expect(
      screen.getByText(/between life and death there is a library/i),
    ).toBeInTheDocument();

    // When description is empty string, About section is omitted
    rerender(
      wrap(
        <BookDetails
          book={{ ...base, id: "x2", description: "", cover: "/b.jpg" }}
        />,
      ),
    );
    expect(
      screen.queryByRole("heading", { name: /about this book/i }),
    ).not.toBeInTheDocument();
  });

  it("shows publisher and ISBN from mock, and respects explicit overrides", () => {
    const { rerender } = render(
      wrap(
        <BookDetails
          book={{
            id: "1",
            title: "Midnight Library",
            author: "Matt Haig",
            cover: "/a.jpg",
          }}
        />,
      ),
    );
    expect(screen.getByText("Publisher:")).toBeInTheDocument();
    expect(screen.getByText("Canongate Books")).toBeInTheDocument();
    expect(screen.getByText("ISBN:")).toBeInTheDocument();
    expect(screen.getByText("978-1786892737")).toBeInTheDocument();

    // Overrides take precedence over mock
    rerender(
      wrap(
        <BookDetails
          book={{
            id: "1",
            title: "Midnight Library",
            author: "Matt Haig",
            cover: "/a.jpg",
            publisher: "Acme Press",
            isbn: "123-456",
          }}
        />,
      ),
    );
    expect(screen.getByText("Acme Press")).toBeInTheDocument();
    expect(screen.getByText("123-456")).toBeInTheDocument();
  });

  it("sets unoptimized=true in non-production and toggles correctly in production for svg/non-svg", () => {
    // default (test env) -> unoptimized true
    const { unmount } = render(
      wrap(<BookDetails book={{ ...base, cover: "/img.jpg" }} />),
    );
    const img1 = screen.getByRole("img", {
      name: /cover of test title by test author/i,
    });
    expect(img1).toHaveAttribute("data-test-unoptimized", "true");

    // production + non-svg -> false
    vi.stubEnv("NODE_ENV", "production");
    unmount();
    const { unmount: unmount2 } = render(
      wrap(<BookDetails book={{ ...base, cover: "/img.jpg" }} />),
    );
    const img2 = screen.getByRole("img", {
      name: /cover of test title by test author/i,
    });
    expect(img2).toHaveAttribute("data-test-unoptimized", "false");

    // production + svg -> true
    unmount2();
    render(wrap(<BookDetails book={{ ...base, cover: "/img.svg" }} />));
    const img3 = screen.getByRole("img", {
      name: /cover of test title by test author/i,
    });
    expect(img3).toHaveAttribute("data-test-unoptimized", "true");
  });
});
