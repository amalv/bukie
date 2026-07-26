import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Column } from "./Column";
import { Container } from "./Container";
import { Grid } from "./Grid";

describe("grid primitives module", () => {
  it("exports components", () => {
    expect(Container).toBeDefined();
    expect(Grid).toBeDefined();
    expect(Column).toBeDefined();
  });

  it("supports semantic list elements without changing span resolution", () => {
    render(
      <Grid as="ul" gap="responsive">
        <Column as="li" span={{ base: 6, lg: 3 }}>
          Book
        </Column>
      </Grid>,
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveStyle({
      "--col-base": "6",
      "--col-lg": "3",
    });
  });
});
