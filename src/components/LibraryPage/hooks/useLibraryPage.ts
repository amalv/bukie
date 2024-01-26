import { useState } from "react";

import { useDebounce } from "./useDebounce";

interface LibraryPageHook {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearch: string;
  error: Error | null;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
}

export const useLibraryPage = (
  debounceDelay: number = 500,
): LibraryPageHook => {
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, debounceDelay);

  return { search, setSearch, debouncedSearch, error, setError };
};
