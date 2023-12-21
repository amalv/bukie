import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookList } from "./BookList";
import { BooksProps } from "./components";

const mockBooks = vi.fn();
vi.mock("./components/Books/Books", () => ({
  Books: (props: BooksProps) => {
    mockBooks(props);
    return <div>Books</div>;
  },
}));

describe("BookList", () => {
  it("renders correctly", () => {
    render(<BookList />);

    expect(screen.getByText("Books")).toBeInTheDocument();

    expect(mockBooks).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "", // Initial debouncedSearch value
        limit: 50,
      })
    );
  });

  it("updates search state correctly", async () => {
    render(<BookList />);

    // Simulate user input to the SearchInput component
    fireEvent.change(screen.getByLabelText("Search by title"), {
      target: { value: "New search value" },
    });

    // Wait for the debounce delay
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));

    // Check that the Books component was called with the updated debouncedSearch value
    expect(mockBooks).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New search value",
      })
    );
  });
});
