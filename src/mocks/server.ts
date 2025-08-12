import { setupServer } from "msw/node";
import { handlers } from "../../mocks/handlers";

// MSW server for Node (Vitest)
export const server = setupServer(...handlers);
