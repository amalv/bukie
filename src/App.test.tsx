import { ReactNode } from "react";
import { describe, it, vi } from "vitest";
import { waitFor, render, screen } from "@testing-library/react";
import App from "./App";

const mockLibraryPage = vi.fn();

vi.mock("@auth0/auth0-react", () => ({
  Auth0Provider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./components/LibraryPage/LibraryPage", () => ({
  LibraryPage: () => {
    mockLibraryPage();
    return <div>LibraryPage</div>;
  },
}));

describe("App", () => {
  it("renders without errors", async () => {
    render(<App />);
    await waitFor(() => expect(mockLibraryPage).toHaveBeenCalled());

    expect(screen.getByText("LibraryPage")).toBeInTheDocument();
  });
});
