import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("Minimal App Shell", () => {
  it("renders Bukie header", () => {
    render(<Page />);
    expect(screen.getByRole("banner")).toHaveTextContent("Bukie");
  });
});
