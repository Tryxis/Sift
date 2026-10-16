import { useGameActions } from "./GameActions";

export function PlayedBeforeToggle({ playedBefore, onChange, ariaLabel }) {
  const { readOnly } = useGameActions();
  if (readOnly) {
    return (
      <span className="flex h-8 w-full items-center justify-center rounded-well border border-border px-2 text-sm text-muted-foreground" aria-label={`${ariaLabel}: ${playedBefore ? "yes" : "no"}`}>
        {playedBefore ? "Y" : "N"}
      </span>
    );
  }

  return (
    <div
      className="relative grid h-8 w-full grid-cols-2 overflow-hidden rounded-well border border-border-strong bg-abyss p-0"
      role="group"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-status-playing/30 transition-transform duration-200 ease-out ${
          playedBefore ? "" : "translate-x-full"
        }`}
      />
      {[true, false].map((value) => {
        const label = value ? "Y" : "N";
        const selected = playedBefore === value;
        return (
          <button
            key={label}
            type="button"
            aria-label={`${value ? "Yes" : "No"}, played before`}
            aria-pressed={selected}
            className={`relative z-10 grid h-full min-w-0 place-items-center rounded-none font-medium transition-colors ${
              selected ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => {
              if (!selected) onChange(value);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
