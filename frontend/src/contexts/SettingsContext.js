import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user, getAccessToken } = useAuth();
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    theme: 'dark',
    language: 'es',
    enter_to_send: true,
    skills: { internet: true, sandbox: true, files: true },
    api_keys: {}
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && Object.keys(data).length > 0) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const updateSettings = async (newSettings) => {
    const token = getAccessToken();
    if (!token) return false;

    // Optimistic update
    setSettings(newSettings);

    try {
      const resp = await fetch(`${API}/api/auth/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });
      return resp.ok;
    } catch (err) {
      console.error("Failed to save settings:", err);
      return false;
    }
  };

  // Apply Theme
  useEffect(() => {
    const applyTheme = (themeName) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      let actualTheme = themeName;
      if (themeName === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      root.classList.add(actualTheme);
      root.style.colorScheme = actualTheme;
    };

    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Apply Language
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
