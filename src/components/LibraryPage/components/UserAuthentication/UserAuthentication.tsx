import { Avatar, CircularProgress, Menu, MenuItem } from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { useState, useCallback } from "react";
import { LoginButton } from "../LoginButton";

export const UserAuthentication = () => {
  const { user, isLoading, logout } = useAuth0();
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
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.preventDefault();
      logout();
    },
    [logout]
  );

  if (isLoading) {
    return <CircularProgress />;
  }

  if (user?.name) {
    return (
      <div>
        <Avatar onClick={handleMenuOpen}>{user.name[0]}</Avatar>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </div>
    );
  }

  return <LoginButton />;
};
