import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lightThemeClass } from "@/design/tokens";
import { BookList } from "./BookList";

const books = [
  { id: "1", title: "A", author: "Auth A", cover: "/a.jpg" },
  { id: "2", title: "B", author: "Auth B", cover: "/b.jpg" },
  { id: "3", title: "C", author: "Auth C", cover: "/c.jpg" },
];

const wrap = (ui: React.ReactElement) => (
  <div className={lightThemeClass}>{ui}</div>
);

describe("BookList", () => {
  it("renders a semantic responsive grid with list items", () => {
    render(wrap(<BookList books={books} />));

    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("data-presentation", "grid");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({
      "--col-base": "6",
      "--col-lg": "3",
      "--col-md": "4",
      "--col-sm": "4",
      "--col-xl": "2",
    });
  });

  it("renders compact rows as one column", () => {
    render(wrap(<BookList books={books} presentation="compact" />));

    expect(screen.getByRole("list")).toHaveAttribute(
      "data-presentation",
      "compact",
    );
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({
      "--col-base": "12",
    });
    expect(
      document.querySelectorAll("article[data-presentation='compact']"),
    ).toHaveLength(3);
  });

  it("passes only explicit rating evidence to cards", () => {
    render(
      wrap(
        <BookList
          books={[
            {
              ...books[0],
              rating: 4.5,
              ratingsCount: 20,
            },
          ]}
          getRatingPresentation={() => ({
            state: "eligible",
            average: 4.5,
            count: 20,
          })}
        />,
      ),
    );

    expect(screen.getByText("4.5 · 20 ratings")).toBeVisible();
  });

  it("announces loading once and hides repeated skeletons", () => {
    const { container } = render(wrap(<BookList loading />));

    expect(screen.getByRole("status")).toHaveTextContent("Loading books");
    expect(container.getElementsByClassName("book-card-skeleton")).toHaveLength(
      8,
    );
    expect(
      container.querySelector("[data-testid='book-list']"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("renders error state with message", () => {
    render(wrap(<BookList error="Oops, failed" />));
    expect(screen.getByRole("alert")).toHaveTextContent("Oops, failed");
  });

  it("shows contextual and generic empty states", () => {
    const { rerender } = render(wrap(<BookList books={[]} q="dune" />));
    expect(
      screen.getByText(/We couldn't find any results matching/i),
    ).toBeVisible();
    expect(screen.getByText(/"dune"/)).toBeVisible();

    rerender(wrap(<BookList books={[]} />));
    expect(
      screen.getByText(/Try searching by title, author, or genre/i),
    ).toBeVisible();
  });

  it("renders footer slot", () => {
    render(
      wrap(
        <BookList
          books={[books[0]]}
          footer={<div data-testid="footer">Footer</div>}
        />,
      ),
    );
    expect(screen.getByTestId("footer")).toBeVisible();
  });
});
