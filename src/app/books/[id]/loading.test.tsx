import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

describe("work detail loading page", () => {
  it("uses the book-specific loading state", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Opening book…");
    expect(
      screen.queryByText(/discover your next great read/i),
    ).not.toBeInTheDocument();
  });
});
