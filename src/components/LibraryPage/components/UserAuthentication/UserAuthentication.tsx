import { Avatar, CircularProgress, Menu, MenuItem } from "@mui/material";
import { User, useAuth0 } from "@auth0/auth0-react";
import { useState, useCallback } from "react";
import { LoginButton } from "../LoginButton";

const UserMenu = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout: (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
}) => {
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

  return (
    <div>
      <Avatar onClick={handleMenuOpen}>{user.name ? user.name[0] : ""}</Avatar>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={onLogout}>Logout</MenuItem>
      </Menu>
    </div>
  );
};

export const UserAuthentication = () => {
  const { user, isLoading, logout } = useAuth0();

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
    return <UserMenu user={user} onLogout={handleLogout} />;
  }

  return <LoginButton />;
};
