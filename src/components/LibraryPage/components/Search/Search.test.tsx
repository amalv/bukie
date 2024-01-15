import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";

import { Search } from "./Search";

describe("Search", () => {
  it("updates the search value when typed into", async () => {
    const setSearch = vi.fn();
    render(<Search search="" setSearch={setSearch} />);

    const input = screen.getByLabelText("Search by title or author");
    const user = userEvent.setup();
    await user.type(input, "Test search");

    const calls = setSearch.mock.calls.map((call) => call[0]).join("");
    expect(calls).toEqual("Test search");
  });
});
