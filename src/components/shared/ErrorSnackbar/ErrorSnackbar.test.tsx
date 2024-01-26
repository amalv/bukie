import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";

import { ErrorSnackbar } from "./ErrorSnackbar";

describe("ErrorSnackbar", () => {
  const user = userEvent.setup();

  it("should be visible and display the correct error message when open is true", () => {
    const handleClose = vi.fn();
    const errorMessage = "Test error message";

    render(
      <ErrorSnackbar
        open={true}
        handleClose={handleClose}
        errorMessage={errorMessage}
      />,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("should call handleClose when the close button is clicked", async () => {
    const handleClose = vi.fn();
    const errorMessage = "Test error message";

    render(
      <ErrorSnackbar
        open={true}
        handleClose={handleClose}
        errorMessage={errorMessage}
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(handleClose).toHaveBeenCalled();
  });
});
