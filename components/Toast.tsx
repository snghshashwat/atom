"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface ToastItem {
  id: string;
  kind: "info" | "success" | "warning" | "danger";
  message: string;
}

interface ToastCtx {
  push: (kind: ToastItem["kind"], message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  warn: (m: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo<ToastCtx>(() => ({
    push,
    success: (m) => push("success", m),
    error: (m) => push("danger", m),
    info: (m) => push("info", m),
    warn: (m) => push("warning", m),
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 60, maxWidth: 380 }}>
        {items.map((t) => (
          <div key={t.id} className={`banner banner-${t.kind}`} style={{ boxShadow: "var(--shadow-md)" }}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}