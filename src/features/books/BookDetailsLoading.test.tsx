import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookDetailsLoading } from "./BookDetailsLoading";

describe("BookDetailsLoading", () => {
  it("announces a focused book transition without catalog placeholders", () => {
    const { container } = render(<BookDetailsLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Opening book…");
    expect(container.querySelector("main")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.queryByText(/new arrivals|all books/i),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".book-card-skeleton")).toHaveLength(0);
  });

  it("stops its decorative animation when reduced motion is preferred", () => {
    const { container } = render(<BookDetailsLoading />);

    expect(
      container.querySelector("[data-book-loading-animation]"),
    ).toHaveClass("motion-reduce:animate-none");
  });
});
