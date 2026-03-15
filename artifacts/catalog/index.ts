import type { Book } from "@/features/books/types";
import { combineCatalogs } from "./build";
import classicsCatalog from "./classics";
import fantasyCatalog from "./fantasy";
import mysteryThrillerCatalog from "./mystery-thriller";
import nonFictionCatalog from "./non-fiction";
import sciFiCatalog from "./sci-fi";

export {
  classicsCatalog,
  fantasyCatalog,
  mysteryThrillerCatalog,
  nonFictionCatalog,
  sciFiCatalog,
};

export const baseCatalog: Book[] = combineCatalogs(
  sciFiCatalog,
  fantasyCatalog,
  mysteryThrillerCatalog,
  nonFictionCatalog,
  classicsCatalog,
);

export default baseCatalog;
