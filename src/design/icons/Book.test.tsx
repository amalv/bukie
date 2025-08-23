import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IconBook from "./Book";

describe("IconBook", () => {
  it("renders SVG with correct props", () => {
    const { container } = render(
      <IconBook
        width={32}
        height={32}
        fill="#123456"
        data-testid="book-icon"
      />,
    );
    const svg = container.querySelector("svg[data-testid='book-icon']");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    expect(svg?.getAttribute("fill")).toBe("#123456");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});
