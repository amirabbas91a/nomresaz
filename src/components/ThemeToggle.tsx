"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  const isDark = dark ?? false;
  return (
    <button
      className="btn btn-ghost btn-icon"
      aria-label={isDark ? "تم روشن" : "تم تاریک"}
      title={isDark ? "تم روشن" : "تم تاریک"}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("nm-theme", next);
        setDark(!isDark);
      }}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
