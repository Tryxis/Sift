import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useGameActions } from "./GameActions";
import { StatusPicker } from "./StatusPicker";
import { PlayedBeforeToggle } from "./PlayedBeforeToggle";
import { FinishedHoursInput } from "./FinishedHoursInput";
import { getStatusMeta } from "@/lib/status";
import { formatHours, formatRelativeTime } from "@/lib/format";
import { useGameStatusChange } from "@/hooks/useGameStatusChange";
import { SORT_OPTIONS } from "@/hooks/useGameFilters";

const DEFAULT_DIRECTIONS = Object.fromEntries(SORT_OPTIONS.map((option) => [option.id, option.defaultDirection]));

const COLUMNS = [
  { id: "name", label: "Game", align: "left" },
  { id: "status", label: "Status", align: "left" },
  { id: "hours", label: "Steam hours", align: "right" },
  { id: "lastPlayed", label: "Last played", align: "right" },
  { id: "reviewScore", label: "Review", align: "right" },
  { id: "timeToBeat", label: "HLTB main", align: "right" },
  { id: "finishedHours", label: "Finished hrs", align: "right" },
  { id: "playedBefore", label: "Played before", align: "center" },
];

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

function SortButton({ column, direction, onToggle }) {
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition-colors hover:text-foreground ${direction ? "text-foreground" : ""}`}
      aria-label={`Sort by ${column.label}${direction ? `, currently ${direction}` : ""}`}
      onClick={onToggle}
    >
      {column.label}
      <Icon className={`h-3.5 w-3.5 ${direction ? "" : "opacity-50"}`} aria-hidden="true" />
    </button>
  );
}

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = indeterminate;
      }}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={label}
      className="h-4 w-4 cursor-pointer accent-[hsl(var(--status-playing))]"
    />
  );
}

function GameTableRow({ game, onUpdateGame, selected, onSelectedChange }) {
  const status = getStatusMeta(game.status);
  const { openDetails, newAppIds } = useGameActions();
  const { handleStatusChange, statusChangePrompt } = useGameStatusChange(game, onUpdateGame);
  const rowBackground = selected ? "bg-[hsl(219_40%_14%)]" : "bg-card group-hover:bg-[hsl(217_22%_11%)]";

  return (
    <tr className={`group transition-colors ${selected ? "bg-status-playing/[0.08]" : "hover:bg-muted/30"}`} data-app-id={game.appId}>
      <td className={`sticky left-0 z-10 w-10 py-2.5 pl-3 pr-1 sm:pl-4 ${rowBackground}`}>
        <Checkbox checked={selected} onChange={onSelectedChange} label={`Select ${game.name}`} />
      </td>
      <th scope="row" className={`sticky left-10 z-10 max-w-[10rem] px-2 py-2.5 text-left font-medium sm:max-w-72 sm:px-3 ${rowBackground}`}>
        <button type="button" onClick={() => openDetails(game.appId)} className="flex max-w-full items-center gap-2 text-left hover:underline" title={game.name}>
          <span className="truncate">{game.name}</span>
          {newAppIds.has(game.appId) && <span className="shrink-0 rounded-full bg-status-playing px-1.5 text-[10px] font-semibold uppercase text-primary-foreground">New</span>}
        </button>
      </th>
      <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
        <span className="inline-flex items-center gap-1.5">
          <StatusPicker status={game.status} onChange={handleStatusChange} gameName={game.name} />
          <span className={`text-xs ${status.textClass}`}>{status.label}</span>
        </span>
        {statusChangePrompt}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums sm:px-4">{formatHours(game.playtimeForeverMinutes)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground sm:px-4">
        {game.lastPlayedUtc ? formatRelativeTime(game.lastPlayedUtc) : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">{game.reviewScore == null ? "—" : `${game.reviewScore.toFixed(1)}%`}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums sm:px-4">{game.timeToBeatMainMinutes == null ? "—" : formatHours(game.timeToBeatMainMinutes)}</td>
      <td className="px-3 py-2.5 sm:px-4">
        <FinishedHoursInput game={game} onUpdateGame={onUpdateGame} className="ml-auto w-24" />
      </td>
      <td className="px-3 py-2.5 sm:px-4">
        <div className="mx-auto w-16">
          <PlayedBeforeToggle
            playedBefore={game.playedBefore}
            onChange={(playedBefore) => onUpdateGame(game.appId, { playedBefore })}
            ariaLabel={`Played before on another platform for ${game.name}`}
          />
        </div>
      </td>
    </tr>
  );
}

export function GameTable({ games, sortColumn, sortDirection, onSortChange, onUpdateGame, selectedIds, onSelectionChange }) {
  const pageIds = games.map((game) => game.appId);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const setSelected = (ids, isSelected) => {
    const next = new Set(selectedIds);
    ids.forEach((id) => (isSelected ? next.add(id) : next.delete(id)));
    onSelectionChange(next);
  };

  // Each header cycles: its natural direction → the reverse → off.
  const toggleSort = (column) => {
    const first = DEFAULT_DIRECTIONS[column] ?? "ascending";
    if (sortColumn !== column) onSortChange(column, first);
    else if (sortDirection === first) onSortChange(column, first === "ascending" ? "descending" : "ascending");
    else onSortChange(null, null);
  };

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="sticky left-0 z-20 w-10 bg-[hsl(217_21%_11%)] py-3 pl-3 pr-1 sm:pl-4">
              <Checkbox
                checked={games.length > 0 && selectedOnPage === games.length}
                indeterminate={selectedOnPage > 0 && selectedOnPage < games.length}
                onChange={(checked) => setSelected(pageIds, checked)}
                label="Select all games on this page"
              />
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={sortColumn === column.id ? sortDirection : "none"}
                className={`whitespace-nowrap px-3 py-3 sm:px-4 ${ALIGN[column.align]} ${column.id === "name" ? "sticky left-10 z-20 bg-[hsl(217_21%_11%)] px-2 sm:px-3" : ""}`}
              >
                <SortButton
                  column={column}
                  direction={sortColumn === column.id ? sortDirection : null}
                  onToggle={() => toggleSort(column.id)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {games.map((game) => (
            <GameTableRow
              key={game.appId}
              game={game}
              onUpdateGame={onUpdateGame}
              selected={selectedIds.has(game.appId)}
              onSelectedChange={(checked) => setSelected([game.appId], checked)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
