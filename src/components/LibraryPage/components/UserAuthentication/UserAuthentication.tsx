import { useState, useCallback } from "react";
import { Avatar, CircularProgress, Menu, MenuItem } from "@mui/material";
import { User, useAuth0 } from "@auth0/auth0-react";
import { LoginButton } from "../LoginButton";

const UserAvatar = ({
  user,
  onClick,
}: {
  user: User;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}) => (
  <Avatar data-testid="user-avatar" onClick={onClick}>
    {user.name ? user.name[0] : ""}
  </Avatar>
);

const UserMenuDropdown = ({
  anchorEl,
  onClose,
  onLogout,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onLogout: (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
}) => (
  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
    <MenuItem onClick={onLogout}>Logout</MenuItem>
  </Menu>
);

const useMenu = () => {
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

  return { anchorEl, handleMenuOpen, handleMenuClose };
};

const UserMenu = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout: (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
}) => {
  const { anchorEl, handleMenuOpen, handleMenuClose } = useMenu();

  return (
    <div>
      <UserAvatar user={user} onClick={handleMenuOpen} />
      <UserMenuDropdown
        anchorEl={anchorEl}
        onClose={handleMenuClose}
        onLogout={onLogout}
      />
    </div>
  );
};

const useLogout = () => {
  const { logout } = useAuth0();

  return useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.preventDefault();
      logout({ logoutParams: { returnTo: window.location.origin } });
      localStorage.removeItem("auth0.token");
    },
    [logout]
  );
};

export const UserAuthentication = () => {
  const { user, isLoading } = useAuth0();
  const handleLogout = useLogout();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (user?.name) {
    return <UserMenu user={user} onLogout={handleLogout} />;
  }

  return <LoginButton />;
};
