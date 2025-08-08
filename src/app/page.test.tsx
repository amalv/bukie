import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  beforeEach(() => {
    render(<Home />);
  });

  it("renders Next.js logo", () => {
    expect(screen.getByAltText("Next.js logo")).toBeInTheDocument();
  });

  it("renders Deploy now CTA", () => {
    expect(screen.getByText("Deploy now")).toBeInTheDocument();
  });

  it("renders Read our docs CTA", () => {
    expect(screen.getByText("Read our docs")).toBeInTheDocument();
  });

  it("renders Get started by editing message", () => {
    expect(screen.getByText(/Get started by editing/i)).toBeInTheDocument();
  });
});
