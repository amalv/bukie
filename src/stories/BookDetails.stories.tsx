import type { Meta, StoryObj } from "@storybook/react";
import { lightThemeClass } from "@/design/tokens.css";
import { BookDetails } from "@/features/books/BookDetails";

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
  args: {
    book: {
      id: "42",
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt, David Thomas",
      cover: "https://placehold.co/180x270",
      genre: "Non-fiction",
      rating: 4.5,
      year: 1999,
    },
  },
};

export const NoOptionalFields: Story = {
  args: {
    book: {
      id: "7",
      title: "Clean Code",
      author: "Robert C. Martin",
      cover: "https://placehold.co/180x270",
    },
  },
};
