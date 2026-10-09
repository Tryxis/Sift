import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FILTER_DEFINITIONS, FILTERS_BY_ID } from "@/lib/filters";

const LEAD_IN = { min: "at least", max: "up to" };

function FilterChip({ definition, bounds, onChange, onRemove }) {
  const single = definition.fields.length === 1;

  const field = (key) => (
    <input
      key={key}
      type="number"
      inputMode="decimal"
      min="0"
      value={bounds[key] ?? ""}
      placeholder={key === "min" ? "Min" : "Max"}
      aria-label={`${definition.label}, ${key === "min" ? "minimum" : "maximum"}`}
      onChange={(e) => onChange({ ...bounds, [key]: e.target.value })}
      className="h-7 w-14 rounded-md border border-border-strong bg-abyss px-2 text-center text-base tabular-nums placeholder:text-muted-foreground/60 sm:h-6 sm:text-[13px]"
    />
  );

  return (
    <div className="flex h-9 items-center gap-2 rounded-full border border-border-strong pl-3.5 pr-1.5 text-[13px] sm:h-8">
      <span className="text-muted-foreground">{definition.label}</span>
      {single ? (
        <>
          <span className="text-muted-foreground">{LEAD_IN[definition.fields[0]]}</span>
          {field(definition.fields[0])}
        </>
      ) : (
        <>
          {field("min")}
          <span className="text-muted-foreground">to</span>
          {field("max")}
        </>
      )}
      <span className="text-muted-foreground">{definition.unit}</span>
      <button
        onClick={onRemove}
        aria-label={`Remove ${definition.label.toLowerCase()} filter`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function FilterBar({ activeFilters, onFilterChange, playedBefore, onPlayedBeforeChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(activeFilters).map(([id, bounds]) => (
        <FilterChip
          key={id}
          definition={FILTERS_BY_ID[id]}
          bounds={bounds}
          onChange={(next) => onFilterChange(id, next)}
          onRemove={() => onFilterChange(id, null)}
        />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={playedBefore === null ? "dashed" : "outline"} size="sm" aria-label="Filter by whether played before">
            Played before: {playedBefore === null ? "Any" : playedBefore ? "Yes" : "No"}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {[
            [null, "Any"],
            [true, "Yes"],
            [false, "No"],
          ].map(([value, label]) => (
            <DropdownMenuItem
              key={label}
              onSelect={() => onPlayedBeforeChange(value)}
              className="justify-between"
            >
              {label}
              {playedBefore === value && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="dashed" size="sm">
            Add filter
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {FILTER_DEFINITIONS.map((definition) => {
            const added = definition.id in activeFilters;
            return (
              <DropdownMenuItem
                key={definition.id}
                disabled={added}
                onSelect={() => onFilterChange(definition.id, { min: "", max: "" })}
                className="justify-between"
              >
                {definition.label}
                {added && <span className="text-[11px] text-muted-foreground">Added</span>}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
