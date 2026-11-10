import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  /** Nombre visible que la clienta eligió al entrar por primera vez. */
  displayName: string;
  /** `true` mientras Firebase resuelve la sesión guardada. */
  loading: boolean;
  signOutUser: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  displayName: "",
  loading: false,
  signOutUser: async () => {},
  updateDisplayName: async () => {},
});

/** Sesión de clientas (y de cualquier usuario de Firebase) en toda la web. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setDisplayName(next?.displayName ?? "");
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName,
      loading,
      signOutUser: async () => {
        if (auth) await signOut(auth);
      },
      updateDisplayName: async (name: string) => {
        if (!auth?.currentUser) throw new Error("No hay una sesión activa.");
        const clean = name.trim().replace(/\s+/g, " ");
        await updateProfile(auth.currentUser, { displayName: clean });
        setDisplayName(clean);
      },
    }),
    [user, displayName, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
