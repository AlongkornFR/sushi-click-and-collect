"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function useStaffAuth() {
  const API = process.env.NEXT_PUBLIC_API_URL_STAGING;
  const router = useRouter();

  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const headers = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Token ${token}` };
  }, [token]);

  useEffect(() => {
    const t = localStorage.getItem("staff_token") || "";
    setToken(t);
    setReady(true);
  }, []);

  async function fetchMe(t = token) {
    if (!t) {
      setMe(null);
      return;
    }
    try {
      const res = await fetch(`${API}/staff/me/`, {
        headers: { Authorization: `Token ${t}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setMe(null);
        return;
      }
      const data = await res.json();
      setMe(data);
    } catch (e) {
      setMe(null);
    }
  }

  async function login(username, password) {
    setError("");
    const res = await fetch(`${API}/staff/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setError(txt || "Login failed");
      return null;
    }
    const data = await res.json();
    if (!data.token) {
      setError("No token returned");
      return null;
    }

    localStorage.setItem("staff_token", data.token);
    setToken(data.token);
    await fetchMe(data.token);
    return data.token;
  }

  function logout() {
    localStorage.removeItem("staff_token");
    setToken("");
    setMe(null);
  }

  async function authFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { ...options.headers, ...headers },
    });
    if (res.status === 401) {
      logout();
      router.replace("/staff/login");
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
    return res;
  }

  return {
    API,
    token,
    me,
    ready,
    error,
    setError,
    headers,
    fetchMe,
    login,
    logout,
    authFetch,
  };
}
