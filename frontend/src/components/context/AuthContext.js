"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await api.get("/auth/me/", {
        headers: { Authorization: `Token ${t}` },
      });
      setCustomer(res.data);
    } catch {
      localStorage.removeItem("customer_token");
      setToken(null);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("customer_token");
    if (t) {
      setToken(t);
      fetchMe(t);
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  function saveToken(t) {
    localStorage.setItem("customer_token", t);
    setToken(t);
    fetchMe(t);
  }

  function logout() {
    localStorage.removeItem("customer_token");
    setToken(null);
    setCustomer(null);
  }

  function authHeaders() {
    return token ? { Authorization: `Token ${token}` } : {};
  }

  return (
    <AuthContext.Provider value={{ token, customer, setCustomer, loading, saveToken, logout, authHeaders, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
