import {
  authorizeField,
  getAdapterManifest,
} from "../../src/db/catalog/enrichment/policies";

export const assertOpenLibraryCoverPublishingAllowed = (): void => {
  const adapter = getAdapterManifest("open-library.covers");
  const permission = authorizeField({
    adapter,
    fieldClass: "asset",
    fieldKey: "edition.covers",
  });
  if (
    !permission.cache ||
    !permission.transform ||
    !permission.display
  ) {
    throw new Error(
      "Open Library cover publishing requires approved cache, transformation, and display permission",
    );
  }
};
