import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { BookCard } from "./BookCard";

describe("BookCard", () => {
  it("uses the work ID route and normalized relationships", () => {
    render(<BookCard work={workSummaryFixture} />);
    expect(
      screen.getByRole("link", { name: /view details for example work/i }),
    ).toHaveAttribute("href", `/books/${workSummaryFixture.id}`);
    expect(
      screen.getByText(/First Author · Second Author/),
    ).toBeInTheDocument();
    expect(screen.getByText("Fiction · 2020")).toBeInTheDocument();
  });

  it("never renders a rating or popularity signal", () => {
    const { container } = render(<BookCard work={workSummaryFixture} />);
    expect(container.textContent).not.toMatch(/rating|trending/i);
    expect(container.querySelector(".book-card-star-icon")).toBeNull();
  });

  it("supports compact presentation", () => {
    const { container } = render(
      <BookCard work={workSummaryFixture} presentation="compact" />,
    );
    expect(
      container.querySelector("[data-presentation='compact']"),
    ).toBeTruthy();
  });
});
