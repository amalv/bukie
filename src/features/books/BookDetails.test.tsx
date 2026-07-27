import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  partialWorkDetailFixture,
  provenanceFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";
import { BookDetails } from "./BookDetails";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    <span role="img" aria-label={props.alt} data-src={props.src} />
  ),
}));

describe("BookDetails", () => {
  it("presents work facts before preferred-edition facts", () => {
    render(<BookDetails work={workDetailFixture} />);
    const headings = screen.getAllByRole("heading").map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      name: heading.textContent,
    }));
    expect(headings.slice(0, 3)).toEqual([
      { level: 1, name: "Example Work" },
      { level: 2, name: "About this work" },
      { level: 2, name: "Preferred edition" },
    ]);
    expect(screen.getByText("First Author, Second Author")).toBeInTheDocument();
    expect(screen.getByText("Stored catalog description.")).toBeInTheDocument();
    expect(screen.getByText("Example Press")).toBeInTheDocument();
    expect(screen.getByText("978-0-441-17271-9")).toBeInTheDocument();
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it("suppresses empty groups and states partial data honestly", () => {
    render(<BookDetails work={partialWorkDetailFixture} />);
    expect(
      screen.queryByRole("heading", { name: /about this work/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /preferred edition/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /alternate editions/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/a description is not available/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/publication details are not available/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "No cover available for Partial Work",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cover not available")).toBeInTheDocument();
    expect(screen.queryByText(/book details/i)).not.toBeInTheDocument();
  });

  it("uses an accurate catalog destination and visible focus target", () => {
    render(<BookDetails work={workDetailFixture} />);
    const catalogLink = screen.getByRole("link", { name: /back to catalog/i });
    expect(catalogLink).toHaveAttribute("href", "/");
    catalogLink.focus();
    expect(catalogLink).toHaveFocus();
  });

  it("uses the selected cover only when cover evidence is eligible", () => {
    render(<BookDetails work={workDetailFixture} />);
    expect(
      screen.getByRole("img", {
        name: /cover of example work by first author, second author/i,
      }),
    ).toHaveAttribute("data-src", "/api/media/covers/example.webp");
  });

  it.each([
    ["conflicting", "Conflicting evidence"],
    ["stale", "Stale"],
    ["withdrawn", "Withdrawn"],
  ] as const)("labels %s provenance without inventing a value", (state, label) => {
    const work = {
      ...partialWorkDetailFixture,
      provenance: [
        ...partialWorkDetailFixture.provenance,
        provenanceFixture(
          "edition",
          "edition-state",
          "edition.publication_date",
          {
            state,
            evidence:
              state === "stale"
                ? provenanceFixture(
                    "edition",
                    "edition-state",
                    "edition.publication_date",
                  ).evidence
                : undefined,
          },
        ),
      ],
      editions: [
        {
          id: "edition-state",
          catalogedAt: 1,
          publishers: [],
          languages: [],
          identifiers: [],
        },
      ],
    };
    render(<BookDetails work={work} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("exposes provenance through a native keyboard-operable disclosure", () => {
    render(<BookDetails work={workDetailFixture} />);
    const summary = screen.getByText("View sources and status");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    summary.focus();
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(
      screen.getAllByText("Bukie legacy catalog artifact").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Jul 26, 2026").length).toBeGreaterThan(0);
  });
});
