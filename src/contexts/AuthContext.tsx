import { createContext, useState, useEffect, useMemo } from "react";
import { IdToken, useAuth0, User } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  aud: string;
}

interface AuthContextProps {
  token: string | null;
  user: User | undefined;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: undefined,
});

const refreshToken = (
  getIdTokenClaims: () => Promise<IdToken | undefined>,
  setToken: (token: string | null) => void
) => {
  getIdTokenClaims().then((claims) => {
    if (claims) {
      const idToken = claims.__raw; // The raw id_token
      localStorage.setItem("auth0.token", idToken);
      setToken(idToken);
      console.log("refreshToken idToken:", idToken); // Add this line

      try {
        const decodedToken: DecodedToken = jwtDecode(idToken);
        const expiryTime = decodedToken.exp * 1000; // Convert to milliseconds
        const timeoutDuration = expiryTime - Date.now() - 60 * 1000; // Refresh 1 minute before expiry

        setTimeout(
          () => refreshToken(getIdTokenClaims, setToken),
          timeoutDuration
        );
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
  });
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, getIdTokenClaims } = useAuth0();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user && getIdTokenClaims) {
      refreshToken(getIdTokenClaims, setToken);
    }
  }, [user, getIdTokenClaims]);

  const value = useMemo(() => ({ token, user }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
