import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type UserState = "loading" | "authenticated" | "unauthenticated";

export const useBookList = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { user, logout, isLoading } = useAuth0();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [search]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
  };

  const getUserState = (): UserState => {
    if (isLoading) return "loading";
    if (user && user.name) return "authenticated";
    return "unauthenticated";
  };

  const userState = getUserState();

  return {
    search,
    setSearch,
    debouncedSearch,
    user,
    anchorEl,
    handleClick,
    handleClose,
    handleLogout,
    userState,
  };
};
