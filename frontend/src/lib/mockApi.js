// In-memory stand-in for the API, enabled with `npm run dev:mock`.
// Lets the UI be explored without a Steam key or a database.
const TITLES = [
  [620, "Portal 2"], [1145360, "Hades"], [413150, "Stardew Valley"], [367520, "Hollow Knight"],
  [1086940, "Baldur's Gate 3"], [292030, "The Witcher 3: Wild Hunt"], [1091500, "Cyberpunk 2077"],
  [632470, "Disco Elysium"], [504230, "Celeste"], [588650, "Dead Cells"], [646570, "Slay the Spire"],
  [1794680, "Vampire Survivors"], [753640, "Outer Wilds"], [105600, "Terraria"], [814380, "Sekiro"],
  [1245620, "Elden Ring"], [374320, "Dark Souls III"], [220, "Half-Life 2"], [546560, "Half-Life: Alyx"],
  [1174180, "Red Dead Redemption 2"], [230410, "Warframe"], [570, "Dota 2"], [730, "Counter-Strike 2"],
  [1172470, "Apex Legends"], [252950, "Rocket League"], [945360, "Among Us"], [264710, "Subnautica"],
  [848450, "Subnautica: Below Zero"], [1966720, "Lethal Company"], [2379780, "Balatro"], [322330, "Don't Starve Together"],
  [1817070, "Marvel's Spider-Man Remastered"], [1593500, "God of War"], [1888930, "The Last of Us Part I"],
  [990080, "Hogwarts Legacy"], [2050650, "Resident Evil 4"], [883710, "Resident Evil 2"], [1196590, "Resident Evil Village"],
  [268910, "Cuphead"], [391540, "Undertale"], [1150690, "OMORI"], [257850, "Hyper Light Drifter"],
  [1942280, "Brotato"], [2139460, "Once Human"], [1203220, "NARAKA: BLADEPOINT"], [578080, "PUBG: BATTLEGROUNDS"],
  [236390, "War Thunder"], [1238810, "Battlefield V"], [359550, "Rainbow Six Siege"], [1449850, "Yu-Gi-Oh! Master Duel"],
  [1623730, "Palworld"], [1326470, "Sons of the Forest"], [242760, "The Forest"], [892970, "Valheim"],
  [427520, "Factorio"], [526870, "Satisfactory"], [294100, "RimWorld"], [255710, "Cities: Skylines"],
  [289070, "Civilization VI"], [1158310, "Crusader Kings III"], [281990, "Stellaris"], [1142710, "Total War: WARHAMMER III"],
];

const STATUS_CYCLE = ["Backlog", "Backlog", "Backlog", "Playing", "Completed", "Completed", "Abandoned", "Problem"];

function seededRandom(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildLibrary(steamId) {
  const random = seededRandom(Number(steamId.slice(-6)) || 42);
  const games = TITLES.map(([appId, name], i) => {
    const unplayed = random() < 0.28;
    const minutes = unplayed ? 0 : Math.round(random() ** 2.4 * 9000);
    return {
      appId,
      name,
      headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
      iconUrl: null,
      playtimeForeverMinutes: minutes,
      playtimeTwoWeeksMinutes: random() < 0.1 ? Math.round(random() * 600) : 0,
      lastPlayedUtc: minutes ? new Date(Date.now() - random() * 3e10).toISOString() : null,
      status: unplayed ? "Backlog" : STATUS_CYCLE[i % STATUS_CYCLE.length],
      timeToBeatMainMinutes: random() < 0.85 ? Math.round(Math.max(4 * 60 + random() ** 1.6 * 70 * 60, minutes * (0.4 + random() * 0.9))) : null,
      timeToBeatMainExtrasMinutes: null,
      timeToBeatCompletionistMinutes: null,
      reviewScore: random() < 0.95 ? Math.round((68 + random() * 29) * 100) / 100 : null,
      reviewCount: Math.round(500 + random() ** 3 * 400000),
      playedBefore: random() < 0.3,
      finishedHours: null,
      priority: null,
      notes: null,
    };
  }).sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes);

  return {
    profile: {
      steamId,
      personaName: "Wren of the Outer Rim",
      avatarUrl: null,
      profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
      isLibraryVisible: true,
      lastSyncedUtc: new Date().toISOString(),
      gameCount: games.length,
    },
    games,
  };
}

const store = new Map();
const savedViews = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_ID = "76561198000000042";

function viewsFor(steamId) {
  if (!savedViews.has(steamId)) savedViews.set(steamId, []);
  return savedViews.get(steamId);
}

export const mockApi = {
  async syncProfile(identifier) {
    await delay(650);
    const steamId = /^\d{17}$/.test(identifier.trim()) ? identifier.trim() : MOCK_ID;
    const fresh = buildLibrary(steamId);
    const existing = store.get(steamId);
    if (existing) {
      // Mirror the real API: sync refreshes Steam data but keeps backlog config.
      const kept = new Map(existing.games.map((g) => [g.appId, g]));
      fresh.games = fresh.games.map((g) => {
        const old = kept.get(g.appId);
        return old ? { ...g, status: old.status, priority: old.priority, notes: old.notes, playedBefore: old.playedBefore, finishedHours: old.finishedHours } : g;
      });
    }
    store.set(steamId, fresh);
    return structuredClone(fresh);
  },

  async getLibrary(steamId) {
    await delay(200);
    const library = store.get(steamId);
    if (!library) {
      const error = new Error(`Profile ${steamId} hasn't been synced yet. Sync it first.`);
      error.status = 404;
      throw error;
    }
    return structuredClone(library);
  },

  async updateBacklog(steamId, appId, patch) {
    await delay(150);
    const game = store.get(steamId)?.games.find((g) => g.appId === appId);
    if (!game) throw new Error(`App ${appId} isn't in this library.`);
    const { clearFinishedHours, ...changes } = patch;
    Object.assign(game, changes);
    if (clearFinishedHours) game.finishedHours = null;
    return structuredClone(game);
  },

  async getSavedViews(steamId) {
    await delay(100);
    return structuredClone(viewsFor(steamId));
  },

  async createSavedView(steamId, body) {
    await delay(100);
    const views = viewsFor(steamId);
    if (views.some((view) => view.name.toLowerCase() === body.name.trim().toLowerCase())) {
      throw new Error(`A saved filter view named '${body.name.trim()}' already exists.`);
    }
    const view = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      configuration: structuredClone(body.configuration),
      isSelected: true,
      updatedUtc: new Date().toISOString(),
    };
    views.forEach((savedView) => { savedView.isSelected = false; });
    views.push(view);
    return structuredClone(view);
  },

  async updateSavedView(steamId, id, body) {
    await delay(100);
    const views = viewsFor(steamId);
    const view = views.find((item) => item.id === id);
    if (!view) throw new Error("Saved filter view not found.");
    if (views.some((item) => item.id !== id && item.name.toLowerCase() === body.name.trim().toLowerCase())) {
      throw new Error(`A saved filter view named '${body.name.trim()}' already exists.`);
    }
    view.name = body.name.trim();
    view.configuration = structuredClone(body.configuration);
    view.updatedUtc = new Date().toISOString();
    return structuredClone(view);
  },

  async selectSavedView(steamId, id) {
    await delay(100);
    const views = viewsFor(steamId);
    if (id && !views.some((view) => view.id === id)) throw new Error("Saved filter view not found.");
    views.forEach((view) => { view.isSelected = view.id === id; });
    return structuredClone(views);
  },

  async deleteSavedView(steamId, id) {
    await delay(100);
    const views = viewsFor(steamId);
    const index = views.findIndex((view) => view.id === id);
    if (index === -1) throw new Error("Saved filter view not found.");
    views.splice(index, 1);
  },
};
