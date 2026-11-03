"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AuthError, authRequest } from "@/lib/auth-api";
import type { LoginResult, User } from "@/lib/auth-api";

const TOKEN_KEY = "newsfoundry.access_token";
const EXPIRED_MESSAGE = "Votre session a expiré. Reconnectez-vous.";

type Session = {
  user: User | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  retry: () => void;
};

const AuthContext = createContext<Session | null>(null);

function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.exp === "number" && Number.isFinite(claims.exp)
      ? claims.exp * 1000
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  // Une réponse ancienne ne doit pas restaurer une session après déconnexion.
  const generation = useRef(0);

  const clearSession = useCallback((message: string | null = null) => {
    generation.current += 1;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // La session mémoire doit aussi être fermée si le stockage est bloqué.
    }
    setUser(null);
    setExpiresAt(null);
    setLoading(false);
    setError(null);
    setNotice(message);
  }, []);

  const restoreSession = useCallback(async () => {
    const requestGeneration = ++generation.current;
    let token: string | null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      setError("Autorisez le stockage local de ce site pour vous connecter.");
      setLoading(false);
      return;
    }
    if (!token) {
      setUser(null);
      setExpiresAt(null);
      setError(null);
      setLoading(false);
      return;
    }
    const expiry = tokenExpiry(token);
    if (expiry === null || expiry <= Date.now()) {
      clearSession(EXPIRED_MESSAGE);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Le décodage local ne prouve rien : l'API vérifie la signature et l'utilisateur.
      const currentUser = await authRequest<User>("me", token);
      if (generation.current !== requestGeneration) return;
      setUser(currentUser);
      setExpiresAt(expiry);
      setNotice(null);
    } catch (cause) {
      if (generation.current !== requestGeneration) return;
      if (cause instanceof AuthError && cause.status === 401) {
        clearSession(EXPIRED_MESSAGE);
      } else {
        setUser(null);
        setExpiresAt(null);
        setError(cause instanceof Error ? cause.message : "Connexion au service impossible.");
      }
    } finally {
      if (generation.current === requestGeneration) setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    // Le stockage navigateur est lu apres hydratation, hors du rendu React.
    queueMicrotask(() => { if (active) void restoreSession(); });
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === null) void restoreSession();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void restoreSession();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      generation.current += 1;
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restoreSession]);

  useEffect(() => {
    if (expiresAt === null) return;
    const timer = window.setTimeout(
      () => clearSession(EXPIRED_MESSAGE),
      Math.min(Math.max(expiresAt - Date.now(), 0), 2147483647),
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt, clearSession]);

  async function signIn(email: string, password: string) {
    const requestGeneration = ++generation.current;
    const result = await authRequest<LoginResult>("login", undefined, { email, password });
    if (generation.current !== requestGeneration) return;
    const expiry = tokenExpiry(result.access_token);
    if (expiry === null || expiry <= Date.now()) {
      throw new Error("Le service a renvoyé une session invalide. Réessayez.");
    }
    try {
      localStorage.setItem(TOKEN_KEY, result.access_token);
    } catch {
      throw new Error("Autorisez le stockage local de ce site pour vous connecter.");
    }
    setUser(result.user);
    setExpiresAt(expiry);
    setError(null);
    setNotice(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{
      user, loading, error, notice, signIn,
      signOut: () => clearSession(),
      retry: () => { void restoreSession(); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider manquant.");
  return context;
}
