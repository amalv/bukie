import { render, act, screen } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";
import { useAuth0 } from "@auth0/auth0-react";
import { vi } from "vitest";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn().mockReturnValue({
    user: { name: "Test User" },
    getIdTokenClaims: vi.fn().mockResolvedValue({
      __raw:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    }),
  }),
}));

describe("AuthProvider", () => {
  it("provides auth context", async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );
    });

    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(useAuth0().getIdTokenClaims).toHaveBeenCalled();
  });
});
