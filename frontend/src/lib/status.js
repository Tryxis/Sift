export const STATUSES = ["Backlog", "Playing", "Completed", "Abandoned", "Problem"];
export const COMPLETED_BEFORE_FILTER = "Completed before";

export const STATUS_META = {
  Backlog: { label: "Backlog", dotClass: "bg-status-backlog", textClass: "text-status-backlog", hex: "#7d889b" },
  Playing: { label: "Playing", dotClass: "bg-status-playing", textClass: "text-status-playing", hex: "#4d8dff" },
  Completed: { label: "Completed", dotClass: "bg-status-completed", textClass: "text-status-completed", hex: "#4fdcaa" },
  [COMPLETED_BEFORE_FILTER]: { label: COMPLETED_BEFORE_FILTER, dotClass: "bg-status-completed-before", textClass: "text-status-completed-before", hex: "#38c9ff" },
  Abandoned: { label: "Abandoned", dotClass: "bg-status-abandoned", textClass: "text-status-abandoned", hex: "#ff5a78" },
  Problem: { label: "Problem", dotClass: "bg-status-problem", textClass: "text-status-problem", hex: "#f4a261" },
};

export function getStatusMeta(status, playedBefore = false) {
  return status === "Completed" && playedBefore ? STATUS_META[COMPLETED_BEFORE_FILTER] : STATUS_META[status];
}
