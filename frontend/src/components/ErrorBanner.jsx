import { X } from "lucide-react";

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="relative z-10 mb-6 flex items-start justify-between gap-4 rounded-card border border-status-abandoned/40 bg-status-abandoned/10 px-4 py-3 text-sm"
    >
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
