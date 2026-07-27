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

  it("renders section purpose, evidence context, and continuation", () => {
    render(
      <SectionHeader
        id="new-arrivals"
        title="New Arrivals"
        description="Recently added to the catalog."
        context="Ordered by catalog date."
        action={<a href="/?sort=added">View all</a>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "New Arrivals" }),
    ).toHaveAttribute("id", "new-arrivals");
    expect(screen.getByText("Recently added to the catalog.")).toBeVisible();
    expect(screen.getByText("Ordered by catalog date.")).toBeVisible();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/?sort=added",
    );
  });
});
