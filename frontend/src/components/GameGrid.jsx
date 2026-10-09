import { Button } from "@/components/ui/button";
import { GameCard } from "./GameCard";

export function GameGrid({ games, onUpdateGame, onClearFilters }) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong py-16 text-center">
        <p className="text-muted-foreground">No games match these filters.</p>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <li key={game.appId}>
          <GameCard game={game} onUpdateGame={onUpdateGame} />
        </li>
      ))}
    </ul>
  );
}
