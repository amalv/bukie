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
});
