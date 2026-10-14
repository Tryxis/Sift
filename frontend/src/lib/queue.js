// The "Up next" queue reuses each game's priority: 1 is next, higher numbers come later.

export function queueOf(games) {
  return games.filter((game) => game.priority > 0).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

/** Patch that puts a game at the end of the queue. */
export function addToQueuePatch(games) {
  const last = games.reduce((max, game) => Math.max(max, game.priority ?? 0), 0);
  return { priority: Math.min(last + 1, 9999) };
}

/** Changes that move one queued game to a new index, renumbering the queue 1..n. */
export function moveInQueue(queue, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= queue.length || fromIndex === toIndex) return [];
  const ordered = [...queue];
  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, moved);
  return ordered
    .map((game, index) => ({ appId: game.appId, patch: { priority: index + 1 }, current: game.priority }))
    .filter((change) => change.current !== change.patch.priority)
    .map(({ appId, patch }) => ({ appId, patch }));
}
