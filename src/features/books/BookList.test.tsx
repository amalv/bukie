import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import * as skel from "./BookCard.skeleton.css";
import { BookList } from "./BookList";

const wrap = (ui: React.ReactElement) => (
  <div className={lightThemeClass}>{ui}</div>
);

describe("BookList", () => {
  it("renders a grid with provided books", () => {
    const books = [
      { id: "1", title: "A", author: "Auth A", cover: "/a.jpg" },
      { id: "2", title: "B", author: "Auth B", cover: "/b.jpg" },
      { id: "3", title: "C", author: "Auth C", cover: "/c.jpg" },
    ];

    render(wrap(<BookList books={books} />));

    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(3);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders error state with message", () => {
    render(wrap(<BookList error="Oops, failed" />));
    expect(screen.getByText(/oops, failed/i)).toBeInTheDocument();
  });

  it("renders 8 skeletons when loading", () => {
    const { container } = render(wrap(<BookList loading />));
    const skeletons = container.getElementsByClassName(skel.skeleton);
    expect(skeletons.length).toBe(8);
  });
});
