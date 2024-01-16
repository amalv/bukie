import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { describe, it, vi } from "vitest";

import { darkModeVar } from "./apolloClient";

describe("apolloClient", () => {
  const mocks = vi.hoisted(() => {
    const mockLink = {
      concat: vi.fn(),
      split: vi.fn(),
      request: vi.fn(),
      setOnError: vi.fn(),
    };
    const createHttpLinkMock = vi.fn().mockReturnValue(mockLink);

    const setContextMock = vi
      .fn()
      .mockImplementation((_, { headers } = { headers: {} }) => {
        const token = localStorage.getItem("auth0.token");
        const authHeaders = token && { authorization: `Bearer ${token}` };
        return {
          headers: {
            ...headers,
            ...authHeaders,
          },
          concat: vi.fn(),
        };
      });
    const httpLink = createHttpLinkMock({
      uri: import.meta.env.VITE_API_URL_DEVELOPMENT,
    });

    return { mockLink, setContextMock, httpLink };
  });

  it("creates ApolloClient with correct configuration", () => {
    vi.mock("@apollo/client", () => ({
      ApolloClient: vi.fn(),
      createHttpLink: vi.fn().mockReturnValue(mocks.mockLink),
      InMemoryCache: vi.fn(),
      makeVar: vi.fn().mockImplementation(() => () => false), // Mock makeVar to return a function that returns false
    }));

    vi.mock("@apollo/client/link/context", () => ({
      setContext: mocks.setContextMock,
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

  it("sets authorization header when token is present in localStorage", () => {
    const token = "test-token";
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(token),
    });

    vi.mock("@apollo/client/link/context", () => ({
      setContext: mocks.setContextMock,
    }));

    const context = mocks.setContextMock({}, { headers: {} });

    expect(context).toEqual({
      headers: {
        authorization: `Bearer ${token}`,
      },
      concat: expect.any(Function),
    });

    vi.unstubAllGlobals();
  });

  it("does not set authorization header when no token in localStorage", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null), // No token
    });

    vi.mock("@apollo/client/link/context", () => ({
      setContext: mocks.setContextMock,
    }));

    const context = mocks.setContextMock({}, { headers: {} });

    expect(context).toEqual({
      headers: {},
      concat: expect.any(Function),
    });

    vi.unstubAllGlobals();
  });
});
