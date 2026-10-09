export const STATUSES = ["Backlog", "Playing", "Completed", "Abandoned", "Problem"];

export const STATUS_META = {
  Backlog: { label: "Backlog", dotClass: "bg-status-backlog", textClass: "text-status-backlog", hex: "#7d889b" },
  Playing: { label: "Playing", dotClass: "bg-status-playing", textClass: "text-status-playing", hex: "#4d8dff" },
  Completed: { label: "Completed", dotClass: "bg-status-completed", textClass: "text-status-completed", hex: "#4fdcaa" },
  Abandoned: { label: "Abandoned", dotClass: "bg-status-abandoned", textClass: "text-status-abandoned", hex: "#ff5a78" },
  Problem: { label: "Problem", dotClass: "bg-status-problem", textClass: "text-status-problem", hex: "#f4a261" },
};
