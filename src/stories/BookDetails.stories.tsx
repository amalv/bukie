import type { Meta, StoryObj } from "@storybook/react";
import { lightThemeClass } from "@/design/tokens";
import { BookDetails } from "@/features/books/BookDetails";
import { workDetailFixture, workSummaryFixture } from "@/test/catalog-fixtures";

const meta = {
  title: "Books/BookDetails",
  component: BookDetails,
  decorators: [
    (Story) => (
      <div className={lightThemeClass} style={{ padding: 16, maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { work: workDetailFixture },
};

export const MissingMetadata: Story = {
  args: {
    work: {
      ...workSummaryFixture,
      authors: [],
      primaryCategory: undefined,
      preferredEdition: undefined,
      description: undefined,
      categories: [],
      editions: [],
    },
  },
};
