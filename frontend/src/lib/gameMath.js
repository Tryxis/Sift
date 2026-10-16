// Small derived values shared by filters, sorting, cards and metrics.

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(isoDate) {
  if (!isoDate) return null;
  return Math.max(0, Math.floor((Date.now() - Date.parse(isoDate)) / DAY_MS));
}

/** Steam playtime as a share of the HLTB main-story estimate (uncapped). */
export function progressPercent(game) {
  if (!game.timeToBeatMainMinutes) return null;
  return (game.playtimeForeverMinutes / game.timeToBeatMainMinutes) * 100;
}

/** Review score per hour of main story: surfaces short, highly rated games. */
export function valueScore(game) {
  if (game.reviewScore == null || !game.timeToBeatMainMinutes) return null;
  return game.reviewScore / Math.max(game.timeToBeatMainMinutes / 60, 1);
}

/**
 * reviewScore is SteamDB's rating, which pulls low-volume scores towards 50%.
 * Inverting the formula recovers Steam's raw positive share for Steam's own wording.
 */
export function rawPositivePercent(game) {
  const { reviewScore: rating, reviewCount: total } = game;
  if (rating == null || !total) return null;
  const k = 2 ** -Math.log10(total + 1);
  if (k >= 1) return null;
  const raw = (rating / 100 - 0.5 * k) / (1 - k);
  return Math.min(100, Math.max(0, raw * 100));
}

/** Steam's review summary wording, e.g. "Very Positive". */
export function reviewDescription(game) {
  const percent = rawPositivePercent(game);
  const count = game.reviewCount ?? 0;
  if (percent == null || count < 10) return count ? `${count} user reviews` : null;
  if (percent >= 95 && count >= 500) return "Overwhelmingly Positive";
  if (percent >= 80) return count >= 50 ? "Very Positive" : "Positive";
  if (percent >= 70) return "Mostly Positive";
  if (percent >= 40) return "Mixed";
  if (percent >= 20) return "Mostly Negative";
  if (count >= 500) return "Overwhelmingly Negative";
  return count >= 50 ? "Very Negative" : "Negative";
}

export function reviewTone(description) {
  if (!description) return "text-muted-foreground";
  if (description.includes("Positive")) return "text-status-playing";
  if (description === "Mixed") return "text-status-problem";
  return "text-status-abandoned";
}

export function steamLinks(game) {
  return [
    { label: "Steam store", href: `https://store.steampowered.com/app/${game.appId}` },
    { label: "HowLongToBeat", href: `https://howlongtobeat.com/?q=${encodeURIComponent(game.name)}` },
    { label: "ProtonDB", href: `https://www.protondb.com/app/${game.appId}` },
    { label: "SteamDB", href: `https://steamdb.info/app/${game.appId}/` },
  ];
}

/** Name key for spotting the same game owned twice (editions, remasters, re-releases). */
export function editionKey(name) {
  return name
    .toLocaleLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\b(game of the year|goty|definitive|special|enhanced|complete|anniversary|remastered|deluxe|ultimate|gold|legendary|director'?s cut|edition|classic|legacy|hd|vr)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(the|a|an)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function findDuplicates(games) {
  const groups = new Map();
  games.forEach((game) => {
    const key = editionKey(game.name);
    if (key.length < 3) return;
    groups.set(key, [...(groups.get(key) ?? []), game]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}
