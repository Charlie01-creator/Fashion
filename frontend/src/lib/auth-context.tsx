"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AuthResponse, PublicUser } from "@fashion-platform/shared";
import { api, setAccessToken } from "./api";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, try to silently refresh using the httpOnly cookie. This is
  // what keeps a user logged in across a page reload without storing the
  // access token anywhere persistent.
  useEffect(() => {
    (async () => {
      try {
        const data = await api.post<AuthResponse>("/auth/refresh", undefined, { skipAuth: true });
        setAccessToken(data.tokens.accessToken);
        setUser(data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password }, { skipAuth: true });
    setAccessToken(data.tokens.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.post<AuthResponse>(
      "/auth/register",
      { name, email, password },
      { skipAuth: true }
    );
    setAccessToken(data.tokens.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
