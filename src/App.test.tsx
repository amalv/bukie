import { ReactNode } from "react";
import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

const mockBookList = vi.fn();

vi.mock("@auth0/auth0-react", () => ({
  Auth0Provider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./components/BookList/BookList", () => ({
  BookList: () => {
    mockBookList();
    return <div>BookList</div>;
  },
}));

describe("App", () => {
  it("renders without errors", () => {
    render(<App />);
    expect(screen.getByText("BookList")).toBeInTheDocument();
  });
});
