import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const API = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const fetchProfile = useCallback(async (supaUser, accessToken) => {
    try {
      const resp = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUser(data);
      } else {
        setUser({ id: supaUser.id, email: supaUser.email, name: '', role: 'user' });
      }
    } catch {
      setUser({ id: supaUser.id, email: supaUser.email, name: '', role: 'user' });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user, s.access_token);
      } else {
        setUser(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user, s.access_token);
      } else {
        setUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    await fetchProfile(data.user, data.session.access_token);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await fetchProfile(data.user, data.session.access_token);
    }
    return data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(false);
    setSession(null);
  };

  const getAccessToken = useCallback(() => {
    return session?.access_token || null;
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, session, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
