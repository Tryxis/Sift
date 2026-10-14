import { GameCard } from "./GameCard";
import { useGameActions } from "./GameActions";

export function GameGrid({ games, onUpdateGame }) {
  const { newAppIds, queuePositions } = useGameActions();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {games.map((game) => (
        <li key={game.appId} className="min-w-0" data-app-id={game.appId}>
          <GameCard
            game={game}
            onUpdateGame={onUpdateGame}
            isNew={newAppIds.has(game.appId)}
            queuePosition={queuePositions.get(game.appId) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}
