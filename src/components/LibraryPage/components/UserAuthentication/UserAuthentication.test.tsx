import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { UserAuthentication } from "./UserAuthentication";
import { useAuth0 } from "@auth0/auth0-react";
import { vi } from "vitest";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

describe("UserAuthentication", () => {
  it("should render loading state", () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: true,
    });

    render(<UserAuthentication />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should render authenticated state", async () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: false,
      user: { name: "Test User" },
    });

    render(<UserAuthentication />);
    fireEvent.click(screen.getByText("T"));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
  });

  it("should render unauthenticated state", () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: false,
      user: null,
    });

    render(<UserAuthentication />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
