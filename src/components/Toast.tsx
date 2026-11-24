"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type T = { id: number; kind: "ok" | "error" | "info"; text: string };
const Ctx = createContext<(kind: T["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-20 start-4 z-[90] flex max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-6" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="glass-float pop-in flex items-center gap-3 px-4 py-3 text-sm font-semibold">
            {t.kind === "ok" ? <CheckCircle2 size={18} className="text-ok" /> : t.kind === "error" ? <AlertCircle size={18} className="text-danger" /> : <Info size={18} className="text-brand" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
