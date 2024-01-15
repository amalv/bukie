import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { describe, it, vi } from "vitest";

import { darkModeVar } from "./apolloClient";

describe("apolloClient", () => {
  it("creates ApolloClient with correct configuration", () => {
    const mocks = vi.hoisted(() => {
      const mockLink = {
        concat: vi.fn(),
        split: vi.fn(),
        request: vi.fn(),
        setOnError: vi.fn(),
      };
      return { mockLink };
    });

    vi.mock("@apollo/client", () => ({
      ApolloClient: vi.fn(),
      createHttpLink: vi.fn().mockReturnValue(mocks.mockLink),
      InMemoryCache: vi.fn(),
      makeVar: vi.fn().mockImplementation(() => () => false), // Mock makeVar to return a function that returns false
    }));

    vi.mock("@apollo/client/link/context", () => ({
      setContext: vi.fn().mockReturnValue(mocks.mockLink),
    }));

    const mockLink = mocks.mockLink;

    expect(ApolloClient).toHaveBeenCalledWith({
      link: mockLink.concat(mockLink),
      cache: {},
    });

    expect(createHttpLink).toHaveBeenCalledWith({
      uri: import.meta.env.VITE_API_URL_DEVELOPMENT,
    });

    expect(setContext).toHaveBeenCalled();

    expect(InMemoryCache).toHaveBeenCalledWith({
      typePolicies: {
        Query: {
          fields: {
            darkMode: {
              read: expect.any(Function),
            },
          },
        },
      },
    });

    const darkModeReadFunction = (InMemoryCache as jest.Mock).mock.calls[0][0]
      .typePolicies.Query.fields.darkMode.read;
    expect(darkModeReadFunction()).toBe(darkModeVar());
  });
});
