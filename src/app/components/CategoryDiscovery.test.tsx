import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryDiscovery } from "./CategoryDiscovery";

describe("CategoryDiscovery", () => {
  it("renders canonical category links with explainable context", () => {
    render(
      <CategoryDiscovery
        categories={[
          { slug: "fantasy", label: "Fantasy" },
          { slug: "science-fiction", label: "Science Fiction" },
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Browse by Category" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ordered A–Z/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fantasy books" })).toHaveAttribute(
      "href",
      "/?category=fantasy",
    );
  });

  it("renders honest loading, empty, and error recovery", () => {
    const { rerender } = render(<CategoryDiscovery loading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading catalog categories",
    );
    rerender(<CategoryDiscovery categories={[]} />);
    expect(screen.getByText(/still being organized/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all books" }),
    ).toHaveAttribute("href", "#all-books");
    rerender(<CategoryDiscovery error />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Categories are temporarily unavailable",
    );
  });
});
