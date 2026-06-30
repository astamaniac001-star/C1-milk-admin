// src/hooks/useAuth.js
import { useState } from "react";
import { callApi } from "../lib/api.js";

export function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [sessionSecret, setSessionSecret] = useState(
    localStorage.getItem("sessionSecret"),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (pin) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi("verifyPIN", { pin });
      localStorage.setItem("token", data.token);
      localStorage.setItem("sessionSecret", data.sessionSecret);
      setToken(data.token);
      setSessionSecret(data.sessionSecret);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionSecret");
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
