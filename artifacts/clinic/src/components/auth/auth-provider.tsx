import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, type AuthResponse } from "@workspace/api-client-react";

type AuthContextType = {
  user: AuthResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error, refetch } = useGetMe();

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, error: error as Error, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
