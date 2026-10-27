import { createContext, useContext } from "react";

/**
 * Shared per-library actions so deeply nested views (cards, rows, the details panel)
 * don't need them threaded through props: open the details panel, update a game, and
 * read the whole library (for queue positions). `readOnly` is true when the library belongs
 * to someone else: editing controls then show their values without letting them change.
 */
const GameActionsContext = createContext({
  steamId: null,
  profileName: null,
  readOnly: false,
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
