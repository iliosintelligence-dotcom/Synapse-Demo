"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import s from "./Toast.module.css";

type Toast = (message: string, kind?: "ok" | "error") => void;
const Ctx = createContext<Toast>(() => {});

/** One toast for the whole portal. A message speaks to the person, not the system, and goes away by itself. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ message: string; kind: "ok" | "error"; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback<Toast>((message, kind = "ok") => {
    clearTimeout(timer.current);
    setT({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setT(null), 3600);
  }, []);
  const value = useMemo(() => toast, [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {t && <div key={t.id} className={`${s.toast} ${t.kind === "error" ? s.err : ""}`} role="status" aria-live="polite">{t.message}</div>}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
