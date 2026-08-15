"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (text, { type = "info", timeout = 4000 } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, text, type }]);
      if (timeout) setTimeout(() => dismiss(id), timeout);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 9999,
          width: "min(420px, calc(100vw - 32px))",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="card"
            style={{
              padding: "10px 14px",
              fontSize: 13,
              cursor: "pointer",
              borderColor:
                t.type === "error" ? "var(--diff-remove)" : t.type === "success" ? "var(--diff-add)" : "var(--line)",
              color: t.type === "error" ? "var(--diff-remove)" : t.type === "success" ? "var(--diff-add)" : "var(--paper)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns notify(text, { type: "info" | "success" | "error", timeout }). */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Never throw over a missing toast host - worst case, calls are no-ops.
    return () => {};
  }
  return ctx;
}
