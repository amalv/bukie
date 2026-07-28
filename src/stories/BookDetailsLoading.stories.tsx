import type { Meta, StoryObj } from "@storybook/react";
import { lightThemeClass } from "@/design/tokens";
import { BookDetailsLoading } from "@/features/books/BookDetailsLoading";

const meta = {
  title: "Books/BookDetailsLoading",
  component: BookDetailsLoading,
  decorators: [
    (Story) => (
      <div className={lightThemeClass} style={{ minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BookDetailsLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
