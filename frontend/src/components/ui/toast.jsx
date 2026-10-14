import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);
let nextId = 1;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-center gap-3 rounded-card border border-border-strong bg-popover py-2.5 pl-4 pr-2 text-sm shadow-[0_12px_40px_hsl(220_33%_2%/0.7)] animate-in fade-in-0 slide-in-from-bottom-2"
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-status-playing hover:bg-muted"
          onClick={() => {
            toast.action.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const show = useCallback((toast) => {
    const id = nextId++;
    // Keep the newest three; an undo toast is only useful while it's recent.
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    return id;
  }, []);
  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
      >
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={dismiss} />)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  // A no-op fallback keeps components usable outside the provider (e.g. isolated previews).
  const fallback = useRef({ show: () => 0, dismiss: () => {} });
  return context ?? fallback.current;
}
