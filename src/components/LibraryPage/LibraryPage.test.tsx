import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { LibraryPage } from "./LibraryPage";
import { useLibraryPage } from "./hooks";

vi.mock("./hooks", () => ({
  useLibraryPage: vi.fn(),
}));

vi.mock("./components/Books", () => ({
  Books: () => <div>Books</div>,
}));

vi.mock("./components/Search", () => ({
  Search: () => <div>Search</div>,
}));

vi.mock("./components/UserAuthentication", () => ({
  UserAuthentication: () => <div>UserAuthentication</div>,
}));

describe("LibraryPage", () => {
  it("renders without crashing", () => {
    (useLibraryPage as jest.Mock).mockReturnValue({
      search: "",
      setSearch: vi.fn(),
      debouncedSearch: "",
      error: null,
      handleLogout: vi.fn(),
      setError: vi.fn(),
    });

    render(<LibraryPage />);
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("UserAuthentication")).toBeInTheDocument();
  });
});
