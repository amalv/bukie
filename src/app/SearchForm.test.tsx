import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchForm } from "./SearchForm";

describe("SearchForm edge cases", () => {
  it("renders with defaultValue", () => {
    render(<SearchForm defaultValue="dune" />);
    expect(screen.getByRole("searchbox")).toHaveValue("dune");
  });

  it("shows clear link when defaultValue is present", () => {
    render(<SearchForm defaultValue="dune" />);
    expect(screen.getByRole("link", { name: /clear/i })).toBeInTheDocument();
  });

  it("does not show clear link when defaultValue is empty", () => {
    render(<SearchForm defaultValue="" />);
    expect(screen.queryByRole("link", { name: /clear/i })).toBeNull();
  });
});
