import type { User } from "@auth0/auth0-react";
import { createContext } from "react";

interface AuthContextProps {
  token: string | null;
  user: User | undefined;
}

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: undefined,
});
