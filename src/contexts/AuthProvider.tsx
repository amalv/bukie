import { useState, useEffect, useMemo } from "react";
import { useAuth0, GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

import { AuthContext } from "./AuthContext";

interface DecodedToken {
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  aud: string;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const decodeToken = (accessToken: string) => {
  try {
    const decodedToken: DecodedToken = jwtDecode(accessToken);
    const expiryTime = decodedToken.exp * 1000; // Convert to milliseconds
    const timeoutDuration = expiryTime - Date.now() - 60 * 1000; // Refresh 1 minute before expiry
    return timeoutDuration;
  } catch (error) {
    return null;
  }
};

const setTokenAndScheduleRefresh = (
  getAccessTokenSilently: (
    options?: GetTokenSilentlyOptions,
  ) => Promise<string>,
  setToken: (token: string | null) => void,
  accessToken: string,
) => {
  localStorage.setItem("auth0.token", accessToken);
  setToken(accessToken);

  const timeoutDuration = decodeToken(accessToken);
  if (timeoutDuration) {
    setTimeout(() => {
      refreshToken(getAccessTokenSilently, setToken);
    }, timeoutDuration);
  }
};

const refreshToken = async (
  getAccessTokenSilently: (
    options?: GetTokenSilentlyOptions,
  ) => Promise<string>,
  setToken: (token: string | null) => void,
) => {
  const accessToken = await getAccessTokenSilently();
  setTokenAndScheduleRefresh(getAccessTokenSilently, setToken, accessToken);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user && getAccessTokenSilently) {
      refreshToken(getAccessTokenSilently, setToken);
    }
  }, [user, getAccessTokenSilently]);

  const value = useMemo(() => ({ token, user }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
