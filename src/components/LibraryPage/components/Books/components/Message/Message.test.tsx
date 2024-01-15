import { render, screen } from "@testing-library/react";

import { Message } from "./Message";

describe("Message", () => {
  it("renders the provided text", () => {
    const testMessage = "Test message";
    render(<Message text={testMessage} />);

    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });
});
