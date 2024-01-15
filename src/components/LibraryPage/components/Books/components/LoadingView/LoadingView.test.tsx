import { render, screen } from "@testing-library/react";

import { LoadingView } from "./LoadingView";

describe("LoadingView", () => {
  it("renders a CircularProgress component", () => {
    render(<LoadingView />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
