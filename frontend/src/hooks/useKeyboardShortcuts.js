import { useEffect, useRef } from "react";

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range"]);

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["TEXTAREA", "SELECT"].includes(target.tagName) ||
    (target.tagName === "INPUT" && !NON_TEXT_INPUTS.has(target.type)));

/**
 * App-wide single-key shortcuts. Ignored while typing, with modifier keys held, or while a
 * dialog or menu is open, so they never fight with text entry or Radix's own keyboard handling.
 */
export function useKeyboardShortcuts(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="alertdialog"]')) return;
      const handler = handlersRef.current[event.key];
      if (!handler) return;
      const focusedGame = event.target instanceof HTMLElement ? event.target.closest("[data-app-id]") : null;
      const handled = handler({ appId: focusedGame ? Number(focusedGame.dataset.appId) : null, event });
      if (handled !== false) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
