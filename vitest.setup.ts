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

vi.mock("@/db/provider", async () => {
	// importActual to preserve non-write exports
	const actual = await vi.importActual<any>("@/db/provider");

	// In-memory set to track IDs created during tests. This prevents writes
	// to the real sqlite DB while allowing update/delete to correctly report
	// not-found for unknown IDs.
	const createdIds = new Set<string>();

	return {
		...actual,
		createBookRow: async (input: any) => {
			const id = input.id ?? `test-${Date.now()}`;
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
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
