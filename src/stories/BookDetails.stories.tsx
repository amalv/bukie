import type { Meta, StoryObj } from "@storybook/react";
import { lightThemeClass } from "@/design/tokens";
import { BookDetails } from "@/features/books/BookDetails";
import type {
  DetailProvenance,
  DetailProvenanceField,
  WorkDetail,
} from "@/features/books/types";
import {
  editionFixture,
  partialWorkDetailFixture,
  provenanceFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";

const meta = {
  title: "Books/BookDetails",
  component: BookDetails,
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
} satisfies Meta<typeof BookDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

function setProvenanceState(
  work: WorkDetail,
  entityId: string,
  field: DetailProvenanceField,
  state: DetailProvenance["state"],
): DetailProvenance[] {
  return work.provenance.map((item) =>
    item.entityId === entityId && item.field === field
      ? {
          ...item,
          state,
          evidence:
            state === "present" || state === "stale"
              ? item.evidence
              : undefined,
        }
      : item,
  );
}

export const Complete: Story = {
  args: { work: workDetailFixture },
};

export const Partial: Story = {
  args: { work: partialWorkDetailFixture },
};

export const MissingCover: Story = {
  args: {
    work: {
      ...workDetailFixture,
      preferredEdition: { ...editionFixture, cover: undefined },
      editions: [{ ...editionFixture, cover: undefined }],
      provenance: setProvenanceState(
        workDetailFixture,
        editionFixture.id,
        "edition.covers",
        "missing",
      ),
    },
  },
};

export const ConflictingPublication: Story = {
  args: {
    work: {
      ...workDetailFixture,
      preferredEdition: { ...editionFixture, publication: undefined },
      editions: [{ ...editionFixture, publication: undefined }],
      provenance: setProvenanceState(
        workDetailFixture,
        editionFixture.id,
        "edition.publication_date",
        "conflicting",
      ),
    },
  },
};

export const StaleDescription: Story = {
  args: {
    work: {
      ...workDetailFixture,
      provenance: setProvenanceState(
        workDetailFixture,
        workDetailFixture.id,
        "work.description",
        "stale",
      ),
    },
  },
};

export const WithdrawnCover: Story = {
  args: {
    work: {
      ...workDetailFixture,
      preferredEdition: { ...editionFixture, cover: undefined },
      editions: [{ ...editionFixture, cover: undefined }],
      provenance: setProvenanceState(
        workDetailFixture,
        editionFixture.id,
        "edition.covers",
        "withdrawn",
      ),
    },
  },
};

const alternateEdition = {
  ...editionFixture,
  id: "20000000-0000-4000-8000-000000000002",
  format: "paperback" as const,
  publication: { date: "2024", precision: "year" as const },
  pages: 288,
  cover: undefined,
};

export const MultipleEditions: Story = {
  args: {
    work: {
      ...workDetailFixture,
      editions: [editionFixture, alternateEdition],
      provenance: [
        ...workDetailFixture.provenance,
        ...(
          [
            "edition.format",
            "edition.publication_date",
            "edition.pages",
          ] as const
        ).map((field) =>
          provenanceFixture("edition", alternateEdition.id, field),
        ),
        ...(
          [
            "edition.title",
            "edition.subtitle",
            "edition.publishers",
            "edition.languages",
            "edition.identifiers",
            "edition.covers",
          ] as const
        ).map((field) =>
          provenanceFixture("edition", alternateEdition.id, field, {
            state: "missing",
            evidence: undefined,
          }),
        ),
      ],
    },
  },
};
