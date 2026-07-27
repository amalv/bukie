import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "./SearchForm";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("SearchForm edge cases", () => {
  beforeEach(() => push.mockReset());

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

  it("preserves filters and serializes a new search canonically", () => {
    render(
      <SearchForm
        defaultValue=""
        query={{
          category: "science-fiction",
          period: "1950-1999",
          sort: "publication",
        }}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "  dune  " },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Search books" }));
    expect(push).toHaveBeenCalledWith(
      "/?q=dune&category=science-fiction&period=1950-1999&sort=publication",
    );
  });
});
