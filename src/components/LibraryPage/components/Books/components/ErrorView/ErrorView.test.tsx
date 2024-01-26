import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ApolloError } from "@apollo/client";
import { vi } from "vitest";

import { ErrorView } from "./ErrorView";

describe("ErrorView", () => {
  it("renders an error message when provided", () => {
    const error = new ApolloError({ errorMessage: "Test error" });

    render(
      <ErrorView
        error={error}
        isErrorSnackbarOpen={true}
        handleCloseSnackbar={vi.fn()}
      />,
    );

    const errorMessages = screen.getAllByText("Test error");
    expect(errorMessages).toHaveLength(2);
  });

  it("calls handleCloseSnackbar when the snackbar is closed", async () => {
    const handleCloseSnackbar = vi.fn();
    const error = new ApolloError({ errorMessage: "Test error" });

    render(
      <ErrorView
        error={error}
        isErrorSnackbarOpen={true}
        handleCloseSnackbar={handleCloseSnackbar}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(handleCloseSnackbar).toHaveBeenCalled();
  });
});
