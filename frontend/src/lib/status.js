export const STATUSES = ["Backlog", "Playing", "Completed", "CompletedBefore", "Abandoned", "Problem", "NotApplicable"];

/** Statuses that mean the game has been finished. */
export const FINISHED_STATUSES = ["Completed", "CompletedBefore"];

/** "Completed before" used to be a filter (Completed + played before); older saved views still hold this name. */
export const LEGACY_COMPLETED_BEFORE = "Completed before";

export const STATUS_META = {
  Backlog: { label: "Backlog", dotClass: "bg-status-backlog", textClass: "text-status-backlog", hex: "#7d889b" },
  Playing: { label: "Playing", dotClass: "bg-status-playing", textClass: "text-status-playing", hex: "#4d8dff" },
  Completed: { label: "Completed", dotClass: "bg-status-completed", textClass: "text-status-completed", hex: "#4fdcaa" },
  CompletedBefore: { label: "Completed before", dotClass: "bg-status-completed-before", textClass: "text-status-completed-before", hex: "#38c9ff" },
  Abandoned: { label: "Abandoned", dotClass: "bg-status-abandoned", textClass: "text-status-abandoned", hex: "#ff5a78" },
  Problem: { label: "Problem", dotClass: "bg-status-problem", textClass: "text-status-problem", hex: "#f4a261" },
  NotApplicable: { label: "Other", dotClass: "bg-status-na", textClass: "text-status-na", hex: "#4a5160" },
};

export function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.Backlog;
}

export const isFinished = (game) => FINISHED_STATUSES.includes(game.status);

/** "Other" covers software, launchers, demos and the like: they're left out of every stat. */
export const isCountable = (game) => game.status !== "NotApplicable";

/** Statuses that appear in stats (everything except Other). */
export const STAT_STATUSES = STATUSES.filter((status) => status !== "NotApplicable");
