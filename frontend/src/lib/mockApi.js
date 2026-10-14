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
const DECK = ["Verified", "Playable", "Unsupported", "Unknown"];
const GENRES = [["Action", "Indie"], ["RPG", "Adventure"], ["Strategy", "Simulation"], ["Action", "Adventure"], ["Indie", "Casual"]];

const WISHLIST_TITLES = [
  [1145350, "Hades II"], [2246340, "Monster Hunter Wilds"], [1030300, "Hollow Knight: Silksong"],
  [553850, "HELLDIVERS 2"], [2358720, "Black Myth: Wukong"], [1716740, "Starfield"],
  [2369390, "Far Cry 6"], [1868140, "Dave the Diver"], [2183900, "Warhammer 40,000: Space Marine 2"],
  [1675200, "Steamworld Build"],
];

const MOCK_ID = "76561198000000042";

function seededRandom(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function timeToBeat(random, minutes) {
  if (random() >= 0.85) {
    return { timeToBeatMainMinutes: null, timeToBeatMainExtrasMinutes: null, timeToBeatCompletionistMinutes: null };
  }
  const main = Math.round(Math.max(4 * 60 + random() ** 1.6 * 70 * 60, minutes * (0.4 + random() * 0.9)));
  return {
    timeToBeatMainMinutes: main,
    timeToBeatMainExtrasMinutes: Math.round(main * (1.3 + random() * 0.6)),
    timeToBeatCompletionistMinutes: Math.round(main * (2 + random() * 1.5)),
  };
}

function achievements(random, minutes) {
  if (random() < 0.2) return { achievementsUnlocked: null, achievementsTotal: null };
  const total = 10 + Math.floor(random() * 60);
  return { achievementsUnlocked: minutes ? Math.floor(total * random() ** 1.3) : 0, achievementsTotal: total };
}

function buildLibrary(steamId) {
  const random = seededRandom(Number(steamId.slice(-6)) || 42);
  const isDemoUser = steamId === MOCK_ID;
  // Other profiles own a random subset, so Compare has partial overlap to show.
  const titles = isDemoUser ? TITLES : TITLES.filter(() => random() < 0.6);
  const games = titles.map(([appId, name], i) => {
    const unplayed = random() < 0.28;
    const minutes = unplayed ? 0 : Math.round(random() ** 2.4 * 9000);
    const recentMinutes = minutes && random() < 0.15 ? Math.round(random() * 600) : 0;
    const lastPlayedUtc = minutes
      ? new Date(Date.now() - (recentMinutes ? random() * 12 : 15 + random() ** 1.5 * 700) * 864e5).toISOString()
      : null;
    return {
      appId,
      name,
      headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
      iconUrl: null,
      playtimeForeverMinutes: minutes,
      playtimeTwoWeeksMinutes: recentMinutes,
      lastPlayedUtc,
      status: !isDemoUser || unplayed ? "Backlog" : STATUS_CYCLE[i % STATUS_CYCLE.length],
      ...timeToBeat(random, minutes),
      reviewScore: random() < 0.95 ? Math.round((68 + random() * 29) * 100) / 100 : null,
      reviewCount: Math.round(500 + random() ** 3 * 400000),
      playedBefore: random() < 0.3,
      finishedHours: null,
      priority: null,
      notes: isDemoUser && i % 11 === 3 ? "Friend recommended this — start on hard mode." : null,
      statusChangedUtc: null,
      notInterested: false,
      genres: GENRES[appId % GENRES.length],
      releaseYear: 2008 + (appId % 17),
      deckCompatibility: DECK[appId % DECK.length],
      isMultiplayer: appId % 3 === 0,
      ...achievements(random, minutes),
    };
  }).sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes);

  return {
    profile: {
      steamId,
      personaName: isDemoUser ? "Wren of the Outer Rim" : `Player ${steamId.slice(-4)}`,
      avatarUrl: null,
      profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
      isLibraryVisible: true,
      lastSyncedUtc: new Date().toISOString(),
      gameCount: games.length,
    },
    games,
  };
}

// Stable mock identities: a SteamID64 is used as-is, anything else hashes to a fake one.
function mockSteamId(identifier) {
  const trimmed = identifier.trim();
  if (/^\d{17}$/.test(trimmed)) return trimmed;
  if (!trimmed || /wren|demo/i.test(trimmed)) return MOCK_ID;
  let hash = 0;
  for (const char of trimmed.toLowerCase()) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return `7656119${String(hash % 1e10).padStart(10, "0")}`;
}

// Fake status history: each non-backlog demo game moved there at some point in the last ~20 months.
function seedHistory(library) {
  const random = seededRandom(7);
  const events = [];
  let id = 1;
  library.games.forEach((game) => {
    if (game.status === "Backlog") return;
    const changedUtc = new Date(Date.now() - random() ** 0.8 * 600 * 864e5).toISOString();
    if (game.status === "Completed" || game.status === "Abandoned") {
      const started = new Date(Date.parse(changedUtc) - (5 + random() * 60) * 864e5).toISOString();
      events.push({ id: id++, appId: game.appId, name: game.name, fromStatus: "Backlog", toStatus: "Playing", changedUtc: started });
      events.push({ id: id++, appId: game.appId, name: game.name, fromStatus: "Playing", toStatus: game.status, changedUtc });
      if (game.playtimeForeverMinutes) game.finishedHours = Math.round(game.playtimeForeverMinutes / 6) / 10;
    } else {
      events.push({ id: id++, appId: game.appId, name: game.name, fromStatus: "Backlog", toStatus: game.status, changedUtc });
    }
    game.statusChangedUtc = changedUtc;
  });
  return events;
}

const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const store = new Map();
const histories = new Map();
const savedViews = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function viewsFor(steamId) {
  if (!savedViews.has(steamId)) savedViews.set(steamId, []);
  return savedViews.get(steamId);
}

const KEPT_FIELDS = ["status", "priority", "notes", "playedBefore", "finishedHours", "notInterested", "statusChangedUtc"];

export const mockApi = {
  // Demo mode has no password gate.
  async getAccessStatus() {
    return { required: false, signedIn: true };
  },

  async signIn() {
    return { required: false, signedIn: true };
  },

  async signOut() {},

  async syncProfile(identifier) {
    await delay(650);
    const steamId = mockSteamId(identifier);
    const fresh = buildLibrary(steamId);
    const existing = store.get(steamId);
    if (existing) {
      // Mirror the real API: sync refreshes Steam data but keeps backlog config.
      const kept = new Map(existing.games.map((g) => [g.appId, g]));
      fresh.games = fresh.games.map((g) => {
        const old = kept.get(g.appId);
        return old ? { ...g, ...Object.fromEntries(KEPT_FIELDS.map((key) => [key, old[key]])) } : g;
      });
    } else if (steamId === MOCK_ID) {
      histories.set(steamId, seedHistory(fresh));
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
    if (changes.status && changes.status !== game.status) {
      const now = new Date().toISOString();
      const events = histories.get(steamId) ?? [];
      events.push({ id: Date.now() + Math.random(), appId, name: game.name, fromStatus: game.status, toStatus: changes.status, changedUtc: now });
      histories.set(steamId, events);
      game.statusChangedUtc = now;
    }
    Object.assign(game, changes);
    if (clearFinishedHours) game.finishedHours = null;
    // Mirror the API: priority 0 and an empty note clear the value.
    if (changes.priority === 0) game.priority = null;
    if (changes.notes === "") game.notes = null;
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

  async getAppDetails(appId) {
    await delay(250);
    const random = seededRandom(appId);
    const multiplayer = appId % 3 === 0;
    return {
      appId,
      shortDescription: "A demo description. With the API running, this comes from the Steam store page.",
      genres: GENRES[appId % GENRES.length],
      categories: multiplayer ? ["Single-player", "Online Co-op", "Steam Achievements"] : ["Single-player", "Steam Achievements"],
      developers: ["Demo Studio"],
      publishers: ["Demo Publishing"],
      releaseDate: `${1 + Math.floor(random() * 28)} Mar, ${2008 + (appId % 17)}`,
      comingSoon: false,
      metacriticScore: random() < 0.6 ? Math.round(70 + random() * 25) : null,
      metacriticUrl: null,
      deckCompatibility: DECK[appId % DECK.length],
      isMultiplayer: multiplayer,
      isSingleplayer: true,
    };
  },

  async getAchievements(steamId, appId) {
    await delay(200);
    const game = store.get(steamId)?.games.find((g) => g.appId === appId);
    if (!game?.achievementsTotal) {
      return { appId, available: false, total: 0, unlocked: 0, percent: null, reason: "This game has no achievements." };
    }
    const { achievementsUnlocked: unlocked, achievementsTotal: total } = game;
    return { appId, available: true, total, unlocked, percent: (unlocked / total) * 100, reason: null };
  },

  async getWishlist(steamId) {
    await delay(400);
    const random = seededRandom(Number(steamId.slice(-5)) || 7);
    return WISHLIST_TITLES.map(([appId, name], index) => {
      const comingSoon = index === 2;
      const discount = random() < 0.3 ? 10 * Math.ceil(random() * 6) : 0;
      return {
        appId,
        name,
        headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
        priority: index + 1,
        addedUtc: new Date(Date.now() - random() * 6e10).toISOString(),
        releaseDate: comingSoon ? "To be announced" : `${1 + Math.floor(random() * 28)} Feb, ${2019 + Math.floor(random() * 6)}`,
        comingSoon,
        reviewScore: comingSoon ? null : Math.round((70 + random() * 26) * 100) / 100,
        reviewCount: comingSoon ? null : Math.round(1000 + random() ** 3 * 200000),
        priceFormatted: `£${(10 + random() * 50).toFixed(2)}`,
        discountPercent: discount || null,
        isFree: false,
        timeToBeatMainMinutes: null,
        timeToBeatMainExtrasMinutes: null,
        timeToBeatCompletionistMinutes: null,
      };
    });
  },

  async getTimeToBeat(appId) {
    await delay(300 + (appId % 5) * 120);
    const random = seededRandom(appId);
    if (random() < 0.15) return { appId, mainMinutes: null, mainExtrasMinutes: null, completionistMinutes: null, matched: false };
    const main = Math.round((5 + random() ** 1.5 * 60) * 60);
    return { appId, mainMinutes: main, mainExtrasMinutes: Math.round(main * 1.5), completionistMinutes: Math.round(main * 2.6), matched: true };
  },

  async getHistory(steamId) {
    await delay(200);
    return structuredClone([...(histories.get(steamId) ?? [])].sort((a, b) => Date.parse(b.changedUtc) - Date.parse(a.changedUtc)));
  },

  async getMonthlyPlaytime(steamId, months = 24) {
    await delay(250);
    const games = store.get(steamId)?.games ?? [];
    const random = seededRandom(Number(steamId.slice(-5)) || 11);
    const now = new Date();
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1));
      // Snapshots only start ~14 months back in the demo, like a real install would.
      const tracked = index >= months - 14;
      const perGame = (tracked ? games.filter(() => random() < 0.12) : [])
        .map((game) => ({ appId: game.appId, name: game.name, minutes: Math.round(random() ** 2 * 1800) }))
        .filter((game) => game.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);
      return { month: monthKey(date), minutes: perGame.reduce((sum, game) => sum + game.minutes, 0), games: perGame.slice(0, 10) };
    });
  },
};
