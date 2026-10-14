export function formatHours(minutes) {
  if (!minutes) return "Unplayed";
  const hours = minutes / 60;
  if (hours < 1) return `${minutes} min`;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString()} hrs`;
}

export function totalHours(games) {
  return Math.round(games.reduce((sum, g) => sum + g.playtimeForeverMinutes, 0) / 60);
}

export function formatRelativeTime(isoDate) {
  if (!isoDate) return "never";
  const seconds = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return rtf.format(-Math.round(value), unit);
    value /= size;
  }
  return "";
}

/** "12 Mar 2026"; the year is dropped for dates in the current year when `short` is set. */
export function formatDate(isoDate, { short = false } = {}) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(short && sameYear ? {} : { year: "numeric" }) });
}

export function minutesToHours(minutes) {
  const hours = minutes / 60;
  return hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours);
}

/** Hours still to go across unfinished games that have an estimate. */
export function hoursLeftToBeat(games) {
  const unfinished = games.filter(
    (g) => (g.status === "Backlog" || g.status === "Playing") && g.timeToBeatMainMinutes
  );
  const minutes = unfinished.reduce(
    (sum, g) => sum + Math.max(g.timeToBeatMainMinutes - g.playtimeForeverMinutes, 0),
    0
  );
  return { hours: Math.round(minutes / 60), gameCount: unfinished.length };
}
