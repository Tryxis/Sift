import { Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { USING_MOCK_API } from "@/lib/api";

/** Tells guests what they're looking at: the demo (sample data) or someone's real library, read-only. */
export function GuestNotice({ isDemo, onSignIn }) {
  // Builds without a server (dev:mock, the preview file) have no real profiles to look up or sign in to.
  const canUseRealProfiles = !USING_MOCK_API;

  return (
    <aside
      aria-label="Guest mode"
      className="relative z-10 mb-4 flex flex-wrap items-start gap-3 rounded-card border border-status-playing/40 bg-status-playing/[0.07] px-4 py-3 text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-playing" aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-relaxed">
        {isDemo ? (
          <>
            <strong className="font-medium">This is a demo library with sample data.</strong> Try anything: changes stay
            in this tab and reset when you leave.{" "}
            {canUseRealProfiles
              ? "To see a real library, look up any Steam profile above (a profile link, custom URL name or SteamID64). It opens read-only."
              : "Profiles you look up here are made-up samples, shown read-only."}
          </>
        ) : (
          <>
            <strong className="font-medium">You&apos;re viewing this library as a guest, read-only.</strong>{" "}
            {canUseRealProfiles ? "Sign in with Steam to organise your own." : "It's a made-up sample profile."}
          </>
        )}
      </p>
      {canUseRealProfiles && (
        <Button variant="outline" size="sm" onClick={onSignIn} className="shrink-0">
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
          Sign in with Steam
        </Button>
      )}
    </aside>
  );
}
