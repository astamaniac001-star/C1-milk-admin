// src/hooks/useAuth.js
import { useState } from "react";
import { callApi } from "../lib/api.js";

// SECURITY: tokens live in sessionStorage (not localStorage) so a stolen
// session is bounded to a single tab + its reloads. localStorage would
// persist across tabs and across site close, giving any XSS payload a much
// longer window to exfiltrate the token.
//
// Trade-off: opening the app in a second tab requires re-auth. That's the
// intended security posture for an internal admin tool.
const STORE = sessionStorage;
const TOKEN_KEY = "token";
const SECRET_KEY = "sessionSecret";

export function useAuth() {
  const [token, setToken] = useState(STORE.getItem(TOKEN_KEY));
  const [sessionSecret, setSessionSecret] = useState(
    STORE.getItem(SECRET_KEY),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (pin) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi("verifyPIN", { pin });
      STORE.setItem(TOKEN_KEY, data.token);
      STORE.setItem(SECRET_KEY, data.sessionSecret);
      setToken(data.token);
      setSessionSecret(data.sessionSecret);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    STORE.removeItem(TOKEN_KEY);
    STORE.removeItem(SECRET_KEY);
    setToken(null);
    setSessionSecret(null);
  };

  return {
    token,
    sessionSecret,
    login,
    logout,
    loading,
    error,
    isAuthenticated: !!token,
  };
}
