import path from "node:path";
import "@testing-library/jest-dom";

// Runtime-backed tests must never migrate or seed the developer database.
process.env.BUKIE_SQLITE_PATH = path.join(
  process.cwd(),
  ".data",
  "catalog-targets",
  `vitest-runtime-${process.pid}.sqlite`,
);
