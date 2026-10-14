import { STATUSES } from "./status";

const CSV_COLUMNS = [
  ["appId", (g) => g.appId],
  ["name", (g) => g.name],
  ["status", (g) => g.status],
  ["playedBefore", (g) => (g.playedBefore ? "yes" : "no")],
  ["finishedHours", (g) => g.finishedHours ?? ""],
  ["priority", (g) => g.priority ?? ""],
  ["notes", (g) => g.notes ?? ""],
  ["steamHours", (g) => Math.round((g.playtimeForeverMinutes / 60) * 10) / 10],
  ["lastPlayedUtc", (g) => g.lastPlayedUtc ?? ""],
  ["reviewScore", (g) => g.reviewScore ?? ""],
  ["hltbMainHours", (g) => (g.timeToBeatMainMinutes == null ? "" : Math.round((g.timeToBeatMainMinutes / 60) * 10) / 10)],
];

function download(filename, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);
const safeName = (name) => name.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "library";

export function exportJson(library) {
  const payload = {
    format: "sift-export",
    version: 1,
    exportedUtc: new Date().toISOString(),
    profile: { steamId: library.profile.steamId, personaName: library.profile.personaName },
    games: library.games.map((g) => ({
      appId: g.appId,
      name: g.name,
      status: g.status,
      playedBefore: g.playedBefore,
      finishedHours: g.finishedHours,
      priority: g.priority,
      notes: g.notes,
    })),
  };
  download(`sift-${safeName(library.profile.personaName)}-${stamp()}.json`, "application/json", JSON.stringify(payload, null, 2));
}

const csvCell = (value) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function exportCsv(library) {
  const lines = [
    CSV_COLUMNS.map(([header]) => header).join(","),
    ...library.games.map((game) => CSV_COLUMNS.map(([, read]) => csvCell(read(game))).join(",")),
  ];
  // BOM so Excel reads UTF-8 names correctly.
  download(`sift-${safeName(library.profile.personaName)}-${stamp()}.csv`, "text/csv", `﻿${lines.join("\r\n")}`);
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header = [], ...body] = rows.filter((r) => r.some((cell) => cell.trim()));
  const keys = header.map((h) => h.replace(/^﻿/, "").trim());
  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? ""])));
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(text)) return true;
  if (["no", "n", "false", "0"].includes(text)) return false;
  return undefined;
}

const STATUS_BY_NAME = Object.fromEntries(STATUSES.map((status) => [status.toLowerCase(), status]));

/** Reads a Sift JSON export or a CSV (e.g. a spreadsheet you kept before Sift) into plain rows. */
export async function readImportFile(file) {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("{")) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed?.games)) throw new Error("That JSON file isn't a Sift export.");
    return parsed.games;
  }
  return parseCsv(text);
}

/**
 * Compares imported rows with the library. Rows match by appId, falling back to an exact
 * (case-insensitive) name. Only fields present in the file are compared; blank cells clear.
 */
export function planImport(rows, games) {
  const byId = new Map(games.map((game) => [game.appId, game]));
  const byName = new Map(games.map((game) => [game.name.toLocaleLowerCase(), game]));
  const changes = [];
  let unmatched = 0;
  let invalid = 0;

  rows.forEach((row) => {
    const game = byId.get(Number(row.appId)) ?? byName.get(String(row.name ?? "").trim().toLocaleLowerCase());
    if (!game) {
      unmatched += 1;
      return;
    }
    const patch = {};
    if ("status" in row && String(row.status ?? "").trim()) {
      const status = STATUS_BY_NAME[String(row.status).trim().toLowerCase()];
      if (status && status !== game.status) patch.status = status;
      if (!status) invalid += 1;
    }
    if ("playedBefore" in row && row.playedBefore !== "" && row.playedBefore != null) {
      const playedBefore = parseBoolean(row.playedBefore);
      if (playedBefore !== undefined && playedBefore !== game.playedBefore) patch.playedBefore = playedBefore;
    }
    if ("finishedHours" in row) {
      const raw = row.finishedHours;
      if (raw === "" || raw == null) {
        if (game.finishedHours != null) patch.clearFinishedHours = true;
      } else {
        const hours = Number(raw);
        if (Number.isFinite(hours) && hours >= 0 && hours <= 1_000_000) {
          if (hours !== game.finishedHours) patch.finishedHours = hours;
        } else invalid += 1;
      }
    }
    if ("priority" in row) {
      const raw = row.priority;
      const priority = raw === "" || raw == null ? 0 : Math.round(Number(raw));
      if (Number.isFinite(priority) && priority >= 0 && priority <= 9999) {
        if ((priority || null) !== (game.priority || null)) patch.priority = priority;
      } else invalid += 1;
    }
    if ("notes" in row) {
      const notes = String(row.notes ?? "").trim().slice(0, 2000);
      if (notes !== (game.notes ?? "").trim()) patch.notes = notes;
    }
    if (Object.keys(patch).length) changes.push({ appId: game.appId, name: game.name, patch });
  });

  return { changes, unmatched, invalid, total: rows.length };
}
