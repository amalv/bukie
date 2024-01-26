import { ApolloError } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { Books } from "./Books";
import { useBooks } from "./hooks";

vi.mock("./hooks", () => ({
  useBooks: vi.fn(),
}));

vi.mock("./components/ErrorView", () => ({
  ErrorView: () => <div>ErrorView</div>,
}));

vi.mock("./components/LoadingView", () => ({
  LoadingView: () => <div>LoadingView</div>,
}));

vi.mock("./components/BooksView", () => ({
  BooksView: () => <div>BooksView</div>,
}));

const mockUseBooks = (
  isErrorSnackbarOpen: boolean,
  loading: boolean,
  error: ApolloError | undefined,
) => {
  (useBooks as jest.Mock).mockReturnValue({
    isErrorSnackbarOpen,
    loading,
    error,
    data: { books: { books: [] } },
    loader: null,
    handleCloseSnackbar: vi.fn(),
  });
};

describe("Books", () => {
  it("renders LoadingView when loading and there's an error", () => {
    const mockError = new ApolloError({ errorMessage: "Test error" });
    mockUseBooks(false, true, mockError);

    render(<Books search="" limit={10} />);
    expect(screen.getByText("LoadingView")).toBeInTheDocument();
    expect(screen.queryByText("ErrorView")).not.toBeInTheDocument();
  });

  it("renders LoadingView when loading and there's no error", () => {
    mockUseBooks(false, true, undefined);

    render(<Books search="" limit={10} />);
    expect(screen.queryByText("ErrorView")).not.toBeInTheDocument();
    expect(screen.getByText("LoadingView")).toBeInTheDocument();
  });

  it("renders ErrorView when not loading and there's an error", () => {
    const mockError = new ApolloError({ errorMessage: "Test error" });
    mockUseBooks(false, false, mockError);

    render(<Books search="" limit={10} />);
    expect(screen.getByText("ErrorView")).toBeInTheDocument();
    expect(screen.queryByText("LoadingView")).not.toBeInTheDocument();
    expect(screen.queryByText("BooksView")).not.toBeInTheDocument();
  });

  it("renders BooksView when not loading and there's no error", () => {
    mockUseBooks(false, false, undefined);

    render(<Books search="" limit={10} />);
    expect(screen.queryByText("ErrorView")).not.toBeInTheDocument();
    expect(screen.queryByText("LoadingView")).not.toBeInTheDocument();
    expect(screen.getByText("BooksView")).toBeInTheDocument();
  });
});
