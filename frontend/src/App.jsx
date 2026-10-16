import { WifiOff } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { GuestNotice } from "@/components/GuestNotice";
import { Landing } from "@/components/Landing";
import { LibraryView } from "@/components/LibraryView";
import { SignInScreen } from "@/components/SignInScreen";
import { ToastProvider } from "@/components/ui/toast";
import { SessionContext, useSession } from "@/hooks/useSession";
import { useLibrary } from "@/hooks/useLibrary";

function Sift({ session }) {
  const { library, newAppIds, isSyncing, isOffline, error, dismissError, lookUp, resync, goHome, updateGame, updateGames } =
    // A guest always starts on the demo library, whatever profile the address names.
    useLibrary({ homeIdentifier: session.steamId, openFromUrl: !session.isGuest });
  // Only the owner changes a library; everyone else (and a guest looking beyond the demo) sees it read-only.
  // The server enforces the same rule.
  const readOnly = Boolean(library) && library.profile.steamId !== session.steamId;

  return (
    <>
      <AppHeader showSearch={Boolean(library)} onSearch={lookUp} isBusy={isSyncing || isOffline} />
      {session.isGuest && library && (
        <GuestNotice isDemo={library.profile.steamId === session.steamId} onSignIn={session.signIn} />
      )}
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
          readOnly={readOnly}
          onGoHome={goHome}
          homeLabel={session.isGuest ? "Back to demo" : "My library"}
          onResync={resync}
          onUpdateGame={updateGame}
          onUpdateGames={updateGames}
        />
      ) : (
        <Landing onSearch={lookUp} onLoadHome={goHome} isBusy={isSyncing} />
      )}
    </>
  );
}

export default function App() {
  const session = useSession();
  const isIn = session.status === "signedIn" || session.status === "guest";

  return (
    <ToastProvider>
      <SessionContext.Provider value={session}>
        <div className="relative min-h-screen overflow-x-clip">
          <div className="nebula" aria-hidden="true" />
          <div className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
            {/* Keyed by user so nothing from one session carries into the next. */}
            {isIn && <Sift key={session.steamId} session={session} />}
            {session.status === "signedOut" && (
              <>
                <AppHeader showSearch={false} />
                <SignInScreen onSignIn={session.signIn} onContinueAsGuest={session.continueAsGuest} />
              </>
            )}
          </div>
        </div>
      </SessionContext.Provider>
    </ToastProvider>
  );
}
