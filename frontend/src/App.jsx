import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Landing } from "@/components/Landing";
import { LibraryView } from "@/components/LibraryView";
import { useLibrary } from "@/hooks/useLibrary";

export default function App() {
  const { library, isSyncing, error, dismissError, lookUp, resync, updateGame } = useLibrary();

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="nebula" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <AppHeader showSearch={Boolean(library)} onSearch={lookUp} isBusy={isSyncing} />
        <ErrorBanner message={error} onDismiss={dismissError} />
        {library ? (
          // Keyed by profile so filters and paging reset when switching profiles.
          <LibraryView
            key={library.profile.steamId}
            library={library}
            isSyncing={isSyncing}
            onResync={resync}
            onUpdateGame={updateGame}
          />
        ) : (
          <Landing onSearch={lookUp} isBusy={isSyncing} />
        )}
      </div>
    </div>
  );
}
