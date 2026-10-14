import { useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUSES, STATUS_META, getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

const TRIGGER_STYLES = {
  // Bare dot with a generous touch target (table rows).
  dot: "group -m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:m-0 sm:h-7 sm:w-7",
  // Full-width field (back of a card).
  boxed: "group flex h-8 w-full min-w-0 items-center gap-1.5 rounded-well border border-border-strong bg-abyss px-2 text-xs",
  // Label beside the dot when the space allows (card fronts); see useLabelFits.
  inline:
    "group flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-full px-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
};

/**
 * Shows the label only if the whole button fits in its container; otherwise just the dot.
 * The label stays in the DOM (collapsed to zero width) so its natural width can be measured.
 */
function useLabelFits(enabled, text, containerRef, buttonRef, labelRef) {
  const [fits, setFits] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const measure = () => {
      const container = containerRef.current;
      const button = buttonRef.current;
      const label = labelRef.current;
      if (!container || !button || !label) return;
      // The collapsed label carries a negative margin to cancel the flex gap; add it back.
      const collapsedMargin = parseFloat(getComputedStyle(label).marginRight) || 0;
      const needed = button.offsetWidth - label.offsetWidth - collapsedMargin + label.scrollWidth;
      setFits(needed <= container.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enabled, text, containerRef, buttonRef, labelRef]);

  return fits;
}

export function StatusPicker({ status, onChange, variant = "dot", gameName }) {
  const triggerRef = useRef(null);
  const containerRef = useRef(null);
  const labelRef = useRef(null);
  const currentMeta = getStatusMeta(status);
  const isInline = variant === "inline";
  const labelFits = useLabelFits(isInline, currentMeta.label, containerRef, triggerRef, labelRef);

  const picker = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Status${gameName ? ` for ${gameName}` : ""}: ${currentMeta.label}. Change status`}
          title={currentMeta.label}
          className={TRIGGER_STYLES[variant]}
        >
          <span
            className={cn(
              "h-3 w-3 shrink-0 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-shadow group-hover:ring-muted-foreground/70 group-data-[state=open]:ring-foreground/80",
              variant === "dot" && "h-3.5 w-3.5",
              currentMeta.dotClass
            )}
          />
          {variant === "boxed" && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{currentMeta.label}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          )}
          {isInline && (
            <span
              ref={labelRef}
              aria-hidden="true"
              className={cn("order-first whitespace-nowrap", !labelFits && "-mr-1.5 max-w-0 overflow-hidden")}
            >
              {currentMeta.label}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => s !== status && onChange(s, triggerRef.current?.getBoundingClientRect() ?? null)}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_META[s].dotClass)} />
            <span className="flex-1">{STATUS_META[s].label}</span>
            {s === status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!isInline) return picker;
  // Takes the rest of the row so the dot sits at the far right.
  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 justify-end">
      {picker}
    </div>
  );
}
