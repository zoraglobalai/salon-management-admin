import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

export type DashboardTheme = "light" | "dark";

type ThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
};

const STORAGE_KEY = "salon-growth-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): DashboardTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<DashboardTheme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (nextTheme: DashboardTheme) => {
    setThemeState(nextTheme);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useDashboardTheme must be used within ThemeProvider.");
  }

  return context;
}
