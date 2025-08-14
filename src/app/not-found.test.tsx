import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders heading and message", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
  });
});
