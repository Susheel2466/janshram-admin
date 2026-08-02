import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { adminApi, getToken, setToken, clearToken, isMock, type AdminProfile } from '../lib/api';
import { setUnauthorizedHandler } from '../lib/http/client';

interface AuthContextType {
  admin: AdminProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  admin: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    adminApi.auth
      .me()
      .then(({ admin }) => setAdmin(admin))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // In HTTP mode, any 401 clears the session so RequireAuth bounces to login.
  useEffect(() => {
    if (!isMock) setUnauthorizedHandler(() => setAdmin(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, admin } = await adminApi.auth.login(email, password);
    setToken(token);
    setAdmin(admin);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
