import { createContext, useContext, useEffect, useState } from "react";

// The pre-paint script in index.html duplicates the storage key and the
// system-theme resolution below - keep the two in sync.
export type Theme = "dark" | "light" | "system";

const themes: Theme[] = ["dark", "light", "system"];

export function isTheme(value: string | null): value is Theme {
  return themes.includes(value as Theme);
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyResolvedTheme = (resolved: "dark" | "light") => {
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = () => applyResolvedTheme(media.matches ? "dark" : "light");

      applySystemTheme();
      media.addEventListener("change", applySystemTheme);
      return () => media.removeEventListener("change", applySystemTheme);
    }

    applyResolvedTheme(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
