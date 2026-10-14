import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_DEFINITIONS, FILTERS_BY_ID } from "@/lib/filters";
import { SORT_OPTIONS } from "@/hooks/useGameFilters";

function FilterChip({ definition, bounds, onChange, onRemove }) {
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
    <div className="flex h-9 max-w-full items-center gap-1.5 rounded-full border border-border-strong pl-3 pr-1.5 text-xs sm:h-8 sm:gap-2 sm:pl-3.5 sm:text-[13px]">
      <span className="whitespace-nowrap text-muted-foreground">{definition.label}</span>
      {field("min")}
      <span className="text-muted-foreground">to</span>
      {field("max")}
      <span className="text-muted-foreground">{definition.unit}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${definition.label.toLowerCase()} filter`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SortMenu({ sortColumn, sortDirection, onSortChange }) {
  const current = SORT_OPTIONS.find((option) => option.id === sortColumn);
  const DirectionIcon = sortDirection === "ascending" ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={current ? "outline" : "dashed"}
            size="sm"
            className={current ? "rounded-r-none border-r-0 pr-2.5" : ""}
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            Sort: {current ? current.label : "Default"}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onSortChange(null, null)} className="justify-between">
            Default
            {!current && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onSelect={() => onSortChange(option.id, option.id === sortColumn ? sortDirection : option.defaultDirection)}
              className="justify-between"
            >
              {option.label}
              {option.id === sortColumn && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {current && (
        <Button
          variant="outline"
          size="sm"
          className="rounded-l-none px-2.5"
          onClick={() => onSortChange(sortColumn, sortDirection === "ascending" ? "descending" : "ascending")}
          aria-label={`Sort direction: ${sortDirection}. Reverse`}
          title={sortDirection === "ascending" ? "Ascending" : "Descending"}
        >
          <DirectionIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/** Any-of picker that stays open while you tick options. */
function MultiSelectMenu({ label, options, values, onChange }) {
  const summary = values.length === 0 ? "Any" : values.length === 1 ? values[0] : `${values.length} selected`;
  const toggle = (option) =>
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={values.length ? "outline" : "dashed"} size="sm" className="max-w-full">
          <span className="truncate">{label}: {summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {options.length === 0 && <p className="px-2.5 py-2 text-xs text-muted-foreground">No data yet. It fills in as store details are fetched.</p>}
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={(event) => {
              event.preventDefault();
              toggle(option);
            }}
            className="justify-between"
          >
            {option}
            {values.includes(option) && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
        {values.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Clear</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TriStateMenu({ label, ariaLabel, value, onChange, yes = "Yes", no = "No" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={value === null ? "dashed" : "outline"} size="sm" aria-label={ariaLabel}>
          {label}: {value === null ? "Any" : value ? yes : no}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {[
          [null, "Any"],
          [true, yes],
          [false, no],
        ].map(([option, text]) => (
          <DropdownMenuItem key={text} onSelect={() => onChange(option)} className="justify-between">
            {text}
            {value === option && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterBar({
  activeFilters,
  onFilterChange,
  playedBefore,
  onPlayedBeforeChange,
  hasNotes,
  onHasNotesChange,
  genreOptions = [],
  genres,
  onGenresChange,
  deckCompatibility,
  onDeckCompatibilityChange,
  multiplayer,
  onMultiplayerChange,
  notInterested,
  onNotInterestedChange,
  sortColumn,
  sortDirection,
  onSortChange,
  showSort = true,
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {showSort && <SortMenu sortColumn={sortColumn} sortDirection={sortDirection} onSortChange={onSortChange} />}
      <TriStateMenu label="Played before" ariaLabel="Filter by whether played before" value={playedBefore} onChange={onPlayedBeforeChange} />
      <TriStateMenu label="Notes" ariaLabel="Filter by whether a game has notes" value={hasNotes} onChange={onHasNotesChange} yes="Has notes" no="No notes" />
      <MultiSelectMenu label="Genre" options={genreOptions} values={genres} onChange={onGenresChange} />
      <MultiSelectMenu label="Steam Deck" options={["Verified", "Playable", "Unsupported", "Unknown"]} values={deckCompatibility} onChange={onDeckCompatibilityChange} />
      <TriStateMenu label="Players" ariaLabel="Filter by multiplayer support" value={multiplayer} onChange={onMultiplayerChange} yes="Multiplayer" no="Single-player only" />
      <TriStateMenu label="Not interested" ariaLabel="Filter by games marked not interested" value={notInterested} onChange={onNotInterestedChange} yes="Only these" no="Hide them" />
      {Object.entries(activeFilters).map(([id, bounds]) => (
        <FilterChip
          key={id}
          definition={FILTERS_BY_ID[id]}
          bounds={bounds}
          onChange={(next) => onFilterChange(id, next)}
          onRemove={() => onFilterChange(id, null)}
        />
      ))}
      {Object.keys(activeFilters).length < FILTER_DEFINITIONS.length && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="dashed" size="sm">
              Add range filter
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {FILTER_DEFINITIONS.filter((definition) => !(definition.id in activeFilters)).map((definition) => (
              <DropdownMenuItem key={definition.id} onSelect={() => onFilterChange(definition.id, { min: "", max: "" })}>
                {definition.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
