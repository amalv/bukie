import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BooksCount } from "./BooksCount";

describe("BooksCount", () => {
  it("displays the correct count", () => {
    render(<BooksCount count={42} />);

    expect(screen.getByText("42 books found")).toBeInTheDocument();
  });
});
