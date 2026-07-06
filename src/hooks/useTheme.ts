import { useState, useCallback, useEffect } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("crm-theme");
    if (stored === "dark" || stored === "light") return stored;
    return getSystemTheme();
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try { localStorage.setItem("crm-theme", next); } catch {}
      return next;
    });
  }, []);

  // Listen for system preference changes (only if user hasn't set a preference)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem("crm-theme")) {
          setTheme(e.matches ? "dark" : "light");
        }
      } catch {}
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { theme, toggleTheme } as const;
}
