import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import { BookDetails } from "./BookDetails";

describe("BookDetails UI", () => {
  it("renders title and author", () => {
    render(
      <div className={lightThemeClass}>
        <BookDetails
          book={{
            id: "1",
            title: "Dune",
            author: "Frank Herbert",
            cover: "https://placehold.co/180x270",
          }}
        />
      </div>,
    );

    expect(screen.getByRole("heading", { name: /dune/i })).toBeInTheDocument();
    expect(screen.getByText(/frank herbert/i)).toBeInTheDocument();
  });
});
