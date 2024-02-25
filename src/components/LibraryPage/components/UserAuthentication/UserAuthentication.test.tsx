import { useAuth0 } from "@auth0/auth0-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { UserAuthentication } from "./UserAuthentication";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn().mockReturnValue({
    getIdTokenClaims: vi.fn().mockResolvedValue({
      __raw: "mocked_token",
    }),
  }),
}));

describe("UserAuthentication", () => {
  it("should render loading state", () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: true,
      getIdTokenClaims: vi.fn().mockResolvedValue({
        __raw: "mocked_token",
      }),
    });

    render(<UserAuthentication />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should render authenticated state", async () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: false,
      user: { name: "Test User" },
      getIdTokenClaims: vi.fn().mockResolvedValue({
        __raw: "mocked_token",
      }),
    });

    render(<UserAuthentication />);
    fireEvent.click(screen.getByText("T"));
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
  });

  it("should render unauthenticated state", () => {
    (useAuth0 as jest.Mock).mockReturnValue({
      isLoading: false,
      user: null,
      getIdTokenClaims: vi.fn().mockResolvedValue({
        __raw: "mocked_token",
      }),
    });

    render(<UserAuthentication />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
