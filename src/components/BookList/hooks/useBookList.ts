import { useState, useCallback, useMemo } from "react";
import { useDebounce } from "./useDebounce";
import { User, useAuth0 } from "@auth0/auth0-react";

type UserState = "loading" | "authenticated" | "unauthenticated";

interface BookListHook {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearch: string;
  error: Error | null;
  user: User | undefined;
  anchorEl: null | HTMLElement;
  isLoading: boolean;
  handleMenuOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMenuClose: () => void;
  handleLogout: (event: React.MouseEvent<HTMLLIElement>) => void;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
  userState: UserState;
}

export const useBookList = (debounceDelay: number = 500): BookListHook => {
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, debounceDelay);
  const { user, logout, isLoading } = useAuth0();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(
    async (event: React.MouseEvent<HTMLLIElement>) => {
      event.preventDefault();
      try {
        await logout();
      } catch (error) {
        setError(new Error("Logout failed"));
        console.error("Logout failed");
      }
    },
    [logout]
  );

  const getUserState = (): UserState => {
    if (isLoading) return "loading";
    if (user && user.name) return "authenticated";
    return "unauthenticated";
  };

  const userState = useMemo(getUserState, [isLoading, user]);

  return {
    search,
    setSearch,
    debouncedSearch,
    isLoading,
    user,
    anchorEl,
    error,
    handleMenuOpen,
    handleMenuClose,
    handleLogout,
    setError,
    userState,
  };
};
