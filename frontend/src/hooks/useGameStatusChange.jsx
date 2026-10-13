import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

function CompletionPrompt({ game, status, finishedHours, triggerRect, onClose, onConfirm }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("resize", updateViewport);
    window.addEventListener("keydown", handleKeyDown);
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const dialogWidth = Math.min(352, viewport.width - 32);
  const left = Math.max(16, Math.min(
    (triggerRect?.left ?? viewport.width / 2) + (triggerRect?.width ?? 0) / 2 - dialogWidth / 2,
    viewport.width - dialogWidth - 16
  ));
  const top = Math.max(24, Math.min(
    (triggerRect?.top ?? viewport.height / 2) - 110,
    viewport.height - 260
  ));
  const replacementNotice = game.finishedHours == null
    ? null
    : `This will replace the current Finished Hours value of ${game.finishedHours} hours.`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`completion-title-${game.appId}`}
        aria-describedby={`completion-description-${game.appId}`}
        className="absolute rounded-card border border-border-strong bg-card p-5 shadow-[0_20px_70px_hsl(220_33%_2%/0.8)]"
        style={{ left, top, width: dialogWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <h2 id={`completion-title-${game.appId}`} className="font-display text-lg font-medium">
            Mark as {status.toLowerCase()}?
          </h2>
          <p id={`completion-description-${game.appId}`} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Copy {finishedHours} hours of current Steam playtime to Finished Hours for <span className="text-foreground">{game.name}</span>?
          </p>
          {replacementNotice && <p className="mt-2 text-xs text-status-problem">{replacementNotice}</p>}
          <p className="mt-2 text-xs text-muted-foreground">This is a one-time copy. Finished Hours will not track future Steam playtime.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="rounded-well border border-border-strong px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-well border border-border-strong px-3 py-2 text-sm transition-colors hover:bg-muted"
            onClick={() => onConfirm(false)}
          >
            Status only
          </button>
          <button
            type="button"
            className="rounded-well bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => onConfirm(true)}
          >
            Copy hours
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function useGameStatusChange(game, onUpdateGame) {
  const [completionPrompt, setCompletionPrompt] = useState(null);
  const closeCompletionPrompt = useCallback(() => setCompletionPrompt(null), []);

  const handleStatusChange = useCallback((status, triggerRect) => {
    if (["Completed", "Abandoned"].includes(status) && game.status !== status) {
      const finishedHours = Number((game.playtimeForeverMinutes / 60).toFixed(2));
      setCompletionPrompt({ status, finishedHours, triggerRect });
      return;
    }
    onUpdateGame(game.appId, { status });
  }, [game, onUpdateGame]);

  const confirmCompletion = useCallback((copyHours) => {
    if (!completionPrompt) return;
    const patch = { status: completionPrompt.status };
    if (copyHours) patch.finishedHours = completionPrompt.finishedHours;
    setCompletionPrompt(null);
    onUpdateGame(game.appId, patch);
  }, [completionPrompt, game.appId, onUpdateGame]);

  return {
    handleStatusChange,
    statusChangePrompt: completionPrompt && (
      <CompletionPrompt
        game={game}
        status={completionPrompt.status}
        finishedHours={completionPrompt.finishedHours}
        triggerRect={completionPrompt.triggerRect}
        onClose={closeCompletionPrompt}
        onConfirm={confirmCompletion}
      />
    ),
  };
}
