import type { Meta, StoryObj } from "@storybook/react";
import { Column, Container, Grid } from "../design/layout/grid";
import { boxHelper } from "../design/layout/grid/grid.css";
import { lightThemeClass, tokens } from "../design/tokens.css";

const meta: Meta = {
  title: "Design/Grid",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "12-column grid primitives. Container centers content; Grid defines columns; Column spans. Gaps and breakpoints derive from tokens.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className={lightThemeClass} style={{ padding: tokens.spacing["2"] }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Basic: StoryObj = {
  render: () => (
    <Container>
      <Grid>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <Column key={n} span={1}>
            <div className={boxHelper}>{n}</div>
          </Column>
        ))}
      </Grid>
    </Container>
  ),
};

export const Gutters: StoryObj = {
  render: () => (
    <Container>
      <Grid gap="md">
        <Column span={6}>
          <div className={boxHelper}>6</div>
        </Column>
        <Column span={6}>
          <div className={boxHelper}>6</div>
        </Column>
        <Column span={4}>
          <div className={boxHelper}>4</div>
        </Column>
        <Column span={4}>
          <div className={boxHelper}>4</div>
        </Column>
        <Column span={4}>
          <div className={boxHelper}>4</div>
        </Column>
      </Grid>
    </Container>
  ),
};

export const ResponsiveSpans: StoryObj = {
  render: () => (
    <Container>
      <Grid gap="sm">
        <Column span={{ base: 12, sm: 6, md: 4 }}>
          <div className={boxHelper}>12 → 6 → 4</div>
        </Column>
        <Column span={{ base: 12, sm: 6, md: 4 }}>
          <div className={boxHelper}>12 → 6 → 4</div>
        </Column>
        <Column span={{ base: 12, sm: 12, md: 4 }}>
          <div className={boxHelper}>12 → 12 → 4</div>
        </Column>
      </Grid>
    </Container>
  ),
};
