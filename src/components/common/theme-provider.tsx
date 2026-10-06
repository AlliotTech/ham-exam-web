"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "themechange";

function getStoredTheme(): Theme {
  return (window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "system";
}

function getServerTheme(): Theme {
  return "system";
}

function getServerSystemTheme(): ResolvedTheme {
  return "light";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

function subscribeTheme(onChange: () => void) {
  const handleChange = () => {
    applyTheme(getStoredTheme());
    onChange();
  };
  applyTheme(getStoredTheme());
  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleChange);
  };
}

function subscribeSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    applyTheme(getStoredTheme());
    onChange();
  };
  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}

function setTheme(nextTheme: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme, getServerSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeScript() {
  const script = `(() => {
    const storageKey = "${THEME_STORAGE_KEY}";
    const root = document.documentElement;
    const storedTheme = localStorage.getItem(storageKey) ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = storedTheme === "system" ? (prefersDark ? "dark" : "light") : storedTheme;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
