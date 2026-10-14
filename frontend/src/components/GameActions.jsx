import { createContext, useContext } from "react";

/**
 * Shared per-library actions so deeply nested views (cards, rows, the details panel)
 * don't need them threaded through props: open the details panel, update a game, and
 * read the whole library (for queue positions).
 */
const GameActionsContext = createContext({
  steamId: null,
  games: [],
  newAppIds: new Set(),
  queuePositions: new Map(),
  openDetails: () => {},
  updateGame: () => {},
});

export const GameActionsProvider = GameActionsContext.Provider;

export function useGameActions() {
  return useContext(GameActionsContext);
}
