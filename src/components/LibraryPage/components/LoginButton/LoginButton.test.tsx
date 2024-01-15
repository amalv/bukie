import { render, fireEvent, screen } from "@testing-library/react";
import { useAuth0 } from "@auth0/auth0-react";
import { vi } from "vitest";

import { LoginButton } from "./LoginButton";

vi.mock("@auth0/auth0-react");

describe("LoginButton", () => {
  it("calls loginWithRedirect when clicked", () => {
    const loginWithRedirect = vi.fn();
    (useAuth0 as jest.Mock).mockReturnValue({
      loginWithRedirect,
    });

    render(<LoginButton />);
    const button = screen.getByText("Log In");

    fireEvent.click(button);

    expect(loginWithRedirect).toHaveBeenCalled();
  });
});
