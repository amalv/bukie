import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./src/mocks/server";

// Prevent unit/integration tests from writing to the local dev sqlite file by
// stubbing provider write operations. Tests that need DB-backed behavior
// should opt into real DB usage explicitly (or use separate integration
// fixtures). This keeps the test run hermetic and avoids polluting
// `.data/dev.sqlite` during normal unit test runs.
//
// We keep read functions from the actual provider so existing mocks and
// fixtures continue to work; only create/update/delete are replaced.
import { vi } from "vitest";
import { randomUUID } from "node:crypto";

// Allow opting into a real DB for integration-style runs by setting
// TEST_USE_REAL_DB=1 in the environment. When set, we skip the provider
// mock so tests run against the real provider (useful for integration checks).
if (process.env.TEST_USE_REAL_DB !== "1") {
	vi.mock("@/db/provider", async () => {
		// importActual to preserve non-write exports
		const actual = await vi.importActual<any>("@/db/provider");

		// In-memory set to track IDs created during tests. This prevents writes
		// to the real sqlite DB while allowing update/delete to correctly report
		// not-found for unknown IDs.
		const createdIds = new Set<string>();

		const mocked = {
			...actual,
			createBookRow: async (input: any) => {
				const id = input.id ?? randomUUID();
				createdIds.add(id);
				return { ...input, id } as any;
			},
			updateBookRow: async (id: string, patch: any) => {
				if (!createdIds.has(id)) return undefined;
				return { id, ...(patch ?? {}) } as any;
			},
			deleteBookRow: async (id: string) => {
				if (!createdIds.has(id)) return false;
				createdIds.delete(id);
				return true;
			},
		};

		// Provide a `provider` object export (the file exports this for DI).
		return {
			...mocked,
			provider: {
				listBooks: mocked.listBooks,
				listNewArrivals: mocked.listNewArrivals,
				listTopRated: mocked.listTopRated,
				listTrendingNow: mocked.listTrendingNow,
				searchBooks: mocked.searchBooks,
				listBooksPage: mocked.listBooksPage,
				searchBooksPage: mocked.searchBooksPage,
				getBook: mocked.getBook,
				createBookRow: mocked.createBookRow,
				updateBookRow: mocked.updateBookRow,
				deleteBookRow: mocked.deleteBookRow,
			},
		};
	});
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
