import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { lightThemeClass, tokens } from "../design/tokens.css";
import { swatch } from "./tokens.css";

// Shared token keys to avoid duplication
const SPACING_KEYS = ["0", "0_5", "1", "1_5", "2", "3", "4", "6", "8"] as const;
const TYPOGRAPHY_KEYS = ["xs", "sm", "md", "lg", "xl"] as const;

const Stack: React.FC<{ gap?: string; children: React.ReactNode }> = ({
  gap = tokens.spacing["1"],
  children,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap }}>
    {children}
  </div>
);

const Row: React.FC<{ gap?: string; children: React.ReactNode }> = ({
  gap = tokens.spacing["1"],
  children,
}) => (
  <div
    style={{ display: "flex", flexDirection: "row", gap, alignItems: "center" }}
  >
    {children}
  </div>
);

const meta: Meta = {
  title: "Design/Tokens",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Foundational tokens inspired by Material 3. Apply the exported theme class (lightThemeClass) high in your app tree (e.g., on the layout wrapper) and reference token values in components/styles. Keep components small and use tokens via Vanilla Extract. This story previews colors, spacing, and type scale.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        className={lightThemeClass}
        style={{
          padding: tokens.spacing["2"],
          background: tokens.color.background,
          color: tokens.color.onBackground,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Colors: StoryObj = {
  render: () => (
    <Stack>
      <Row>
        <div className={swatch} style={{ background: tokens.color.primary }} />
        <span>primary / onPrimary</span>
      </Row>
      <Row>
        <div className={swatch} style={{ background: tokens.color.surface }} />
        <span>surface / onSurface</span>
      </Row>
      <Row>
        <div
          className={swatch}
          style={{ background: tokens.color.background }}
        />
        <span>background / onBackground</span>
      </Row>
      <Row>
        <div className={swatch} style={{ background: tokens.color.error }} />
        <span>error / onError</span>
      </Row>
    </Stack>
  ),
};

export const Spacing: StoryObj = {
  render: () => {
    const ref = useRef<HTMLDivElement>(null);
    const [resolved, setResolved] = useState<Record<string, string>>({});
    useEffect(() => {
      if (!ref.current) return;
      const el = ref.current;
      const keys = SPACING_KEYS;
      const next: Record<string, string> = {};
      for (const k of keys) {
        const v = tokens.spacing[k];
        const m = /^var\((--[^)]+)\)/.exec(v);
        next[k] = m ? getComputedStyle(el).getPropertyValue(m[1]).trim() : v;
      }
      setResolved(next);
    }, []);
    return (
      <div ref={ref}>
        <Stack>
          {SPACING_KEYS.map((k) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: tokens.spacing["1"],
              }}
            >
              <div
                style={{
                  width: tokens.spacing[k],
                  height: tokens.spacing[k],
                  background: tokens.color.primary,
                  opacity: 0.3,
                }}
              />
              <code>
                spacing[{k}] = {resolved[k] ?? tokens.spacing[k]}
              </code>
            </div>
          ))}
        </Stack>
      </div>
    );
  },
};

export const Typography: StoryObj = {
  render: () => {
    const ref = useRef<HTMLDivElement>(null);
    const [resolved, setResolved] = useState<Record<string, string>>({});
    useEffect(() => {
      if (!ref.current) return;
      const el = ref.current;
      const keys = TYPOGRAPHY_KEYS;
      const next: Record<string, string> = {};
      for (const k of keys) {
        const v = tokens.typography[k];
        const m = /^var\((--[^)]+)\)/.exec(v);
        next[k] = m ? getComputedStyle(el).getPropertyValue(m[1]).trim() : v;
      }
      // line height
      const lh = tokens.typography.lineHeight.normal;
      const lm = /^var\((--[^)]+)\)/.exec(lh);
      next.lineHeight = lm
        ? getComputedStyle(el).getPropertyValue(lm[1]).trim()
        : lh;
      setResolved(next);
    }, []);
    return (
      <div ref={ref}>
        <Stack>
          {TYPOGRAPHY_KEYS.map((k) => (
            <div
              key={k}
              style={{
                fontSize: tokens.typography[k],
                lineHeight: tokens.typography.lineHeight.normal,
              }}
            >
              The quick brown fox — {k} ({resolved[k] ?? tokens.typography[k]})
            </div>
          ))}
        </Stack>
      </div>
    );
  },
};
