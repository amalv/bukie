import { ApolloError } from "@apollo/client";
import { render, screen } from "@testing-library/react";
import { Books } from "./Books";
import { useBooks } from "./hooks";
import { vi } from "vitest";

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

describe("Books", () => {
  it("renders ErrorView when loading and there's an error", () => {
    const mockError = new ApolloError({ errorMessage: "Test error" });
    (useBooks as jest.Mock).mockReturnValue({
      isErrorSnackbarOpen: false,
      loading: true,
      error: mockError,
      data: { books: { books: [] } },
      loader: null,
      handleCloseSnackbar: vi.fn(),
    });

    render(<Books search="" limit={10} />);
    expect(screen.getByText("ErrorView")).toBeInTheDocument();
    expect(screen.queryByText("LoadingView")).not.toBeInTheDocument();
  });

  it("renders LoadingView when loading and there's no error", () => {
    (useBooks as jest.Mock).mockReturnValue({
      isErrorSnackbarOpen: false,
      loading: true,
      error: null,
      data: { books: { books: [] } },
      loader: null,
      handleCloseSnackbar: vi.fn(),
    });

    render(<Books search="" limit={10} />);
    expect(screen.queryByText("ErrorView")).not.toBeInTheDocument();
    expect(screen.getByText("LoadingView")).toBeInTheDocument();
  });

  it("renders ErrorView when not loading and there's an error", () => {
    const mockError = new ApolloError({ errorMessage: "Test error" });
    (useBooks as jest.Mock).mockReturnValue({
      isErrorSnackbarOpen: false,
      loading: false,
      error: mockError,
      data: { books: { books: [] } },
      loader: null,
      handleCloseSnackbar: vi.fn(),
    });

    render(<Books search="" limit={10} />);
    expect(screen.getByText("ErrorView")).toBeInTheDocument();
    expect(screen.queryByText("BooksView")).not.toBeInTheDocument();
  });

  it("renders BooksView when not loading and there's no error", () => {
    (useBooks as jest.Mock).mockReturnValue({
      isErrorSnackbarOpen: false,
      loading: false,
      error: null,
      data: { books: { books: [] } },
      loader: null,
      handleCloseSnackbar: vi.fn(),
    });

    render(<Books search="" limit={10} />);
    expect(screen.queryByText("ErrorView")).not.toBeInTheDocument();
    expect(screen.getByText("BooksView")).toBeInTheDocument();
  });
});
