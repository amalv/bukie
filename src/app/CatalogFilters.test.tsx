import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogFilters } from "./CatalogFilters";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("CatalogFilters", () => {
  beforeEach(() => push.mockReset());

  it("renders labeled controls and active context", () => {
    render(
      <CatalogFilters
        categories={[{ slug: "science-fiction", label: "Science Fiction" }]}
        query={{
          q: "dune",
          category: "science-fiction",
          period: "1950-1999",
          sort: "publication",
        }}
      />,
    );
    expect(screen.getByLabelText("Category")).toHaveValue("science-fiction");
    expect(screen.getByLabelText("Publication period")).toHaveValue(
      "1950-1999",
    );
    expect(screen.getByLabelText("Sort by")).toHaveValue("publication");
    expect(screen.getByText(/Active filters:/)).toHaveTextContent(
      "Category: Science Fiction",
    );
  });

  it("applies one canonical shareable URL", () => {
    render(
      <CatalogFilters
        categories={[{ slug: "science-fiction", label: "Science Fiction" }]}
        query={{ q: "the", sort: "title" }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "science-fiction" },
    });
    fireEvent.change(screen.getByLabelText("Publication period"), {
      target: { value: "1950-1999" },
    });
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "publication" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(push).toHaveBeenCalledWith(
      "/?q=the&category=science-fiction&period=1950-1999&sort=publication",
    );
  });
});
