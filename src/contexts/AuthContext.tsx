import { createContext } from "react";
import { User } from "@auth0/auth0-react";

interface AuthContextProps {
  token: string | null;
  user: User | undefined;
}

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: undefined,
});
