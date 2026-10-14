import { WifiOff } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Landing } from "@/components/Landing";
import { LibraryView } from "@/components/LibraryView";
import { PasswordGate } from "@/components/PasswordGate";
import { ToastProvider } from "@/components/ui/toast";
import { AccessContext, useAccess } from "@/hooks/useAccess";
import { useLibrary } from "@/hooks/useLibrary";

function Sift() {
  const { library, newAppIds, isSyncing, isOffline, error, dismissError, lookUp, resync, updateGame, updateGames } = useLibrary();

  return (
    <>
      <AppHeader showSearch={Boolean(library)} onSearch={lookUp} isBusy={isSyncing || isOffline} />
      {isOffline && (
        <p role="status" className="relative z-10 mb-4 flex items-center gap-2 rounded-card border border-status-problem/40 bg-status-problem/10 px-4 py-2.5 text-sm">
          <WifiOff className="h-4 w-4 shrink-0 text-status-problem" aria-hidden="true" />
          You&apos;re offline. Showing your last synced library; changes won&apos;t save until you reconnect.
        </p>
      )}
      <ErrorBanner message={error} onDismiss={dismissError} />
      {library ? (
        // Keyed by profile so filters and paging reset when switching profiles.
        <LibraryView
          key={library.profile.steamId}
          library={library}
          newAppIds={newAppIds}
          isSyncing={isSyncing}
          onResync={resync}
          onUpdateGame={updateGame}
          onUpdateGames={updateGames}
        />
      ) : (
        <Landing onSearch={lookUp} isBusy={isSyncing} />
      )}
    </>
  );
}

export default function App() {
  const access = useAccess();

  return (
    <ToastProvider>
      <AccessContext.Provider value={access}>
        <div className="relative min-h-screen overflow-x-clip">
          <div className="nebula" aria-hidden="true" />
          <div className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
            {access.status === "open" && <Sift />}
            {access.status === "locked" && (
              <>
                <AppHeader showSearch={false} />
                <PasswordGate onSignIn={access.signIn} />
              </>
            )}
          </div>
        </div>
      </AccessContext.Provider>
    </ToastProvider>
  );
}
