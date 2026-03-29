// Generated with Claude Code
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => localStorage.getItem('role'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setUser(null);
  }, []);

  const loginSuccess = useCallback((tokenData) => {
    localStorage.setItem('token', tokenData.token);
    // Decode role from JWT
    try {
      const payload = JSON.parse(atob(tokenData.token.split('.')[1]));
      localStorage.setItem('role', payload.role);
      setRole(payload.role);
    } catch {
      localStorage.setItem('role', '');
    }
    setToken(tokenData.token);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [logout]);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ token, role, user, setUser, loginSuccess, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
