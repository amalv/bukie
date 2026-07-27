import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { BookList } from "./BookList";

describe("BookList", () => {
  it("renders normalized works", () => {
    render(<BookList works={[workSummaryFixture]} />);
    expect(screen.getByText(workSummaryFixture.title)).toBeInTheDocument();
  });

  it("renders loading, error, and search-aware empty states", () => {
    const { rerender } = render(<BookList loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading books");
    rerender(<BookList error="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    rerender(<BookList works={[]} q="missing" />);
    expect(screen.getByText(/matching/)).toHaveTextContent("missing");
  });

  it("renders a pagination footer", () => {
    render(
      <BookList
        works={[workSummaryFixture]}
        footer={<button type="button">More</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });
});
