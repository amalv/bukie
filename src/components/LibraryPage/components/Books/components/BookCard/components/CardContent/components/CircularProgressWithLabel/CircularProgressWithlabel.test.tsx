import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CircularProgressWithLabel } from "./CircularProgressWithLabel";

describe("CircularProgressWithLabel", () => {
  it("should render a circular progress bar with a label", () => {
    const value = 50;

    const { getByText } = render(<CircularProgressWithLabel value={value} />);
    const progress = getByText(`${value}%`);

    expect(progress.textContent).toBe("50%");
  });
});
