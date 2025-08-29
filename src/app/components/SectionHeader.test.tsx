import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("renders the title and icon correctly", () => {
    render(
      <SectionHeader icon={<svg data-testid="icon" />} title="Test Title" />,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
