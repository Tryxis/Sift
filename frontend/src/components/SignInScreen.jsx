import { useEffect, useState } from "react";
import { Eye, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIGN_IN_ERRORS = {
  failed: "Steam sign-in didn't complete. Try again.",
  denied: "That Steam account isn't allowed to sign in to this Sift.",
};

// Steam sends the browser back with ?signin=failed|denied when a sign-in doesn't go through.
function readSignInError() {
  const reason = new URLSearchParams(window.location.search).get("signin");
  return reason ? SIGN_IN_ERRORS[reason] ?? SIGN_IN_ERRORS.failed : null;
}

function clearSignInError() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("signin")) return;
    url.searchParams.delete("signin");
    window.history.replaceState(null, "", url);
  } catch {
    /* sandboxed environments may block history; not essential */
  }
}

export function SignInScreen({ onSignIn, onContinueAsGuest }) {
  const [error] = useState(readSignInError);
  useEffect(clearSignInError, []);

  return (
    <section className="relative z-10 flex min-h-[60vh] flex-col justify-center py-16">
      <h1 className="max-w-3xl font-display text-5xl font-light leading-[1.05] tracking-tight md:text-7xl">
        Sift through the pile.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Sort every game in your Steam library into what you&apos;re playing, what you&apos;ve finished, and
        what you&apos;re letting go.
      </p>

      {error && (
        <p role="alert" className="mt-8 max-w-xl rounded-card border border-status-abandoned/40 bg-status-abandoned/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
        <Button onClick={onSignIn} className="h-12 px-6 text-base">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in with Steam
        </Button>
        <Button variant="outline" onClick={onContinueAsGuest} className="h-12 px-6 text-base">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Continue as guest
        </Button>
      </div>

      <ul className="mt-6 max-w-xl space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            You sign in on Steam&apos;s own site. Sift never sees your password, only your public Steam ID.
            You can change your own library, and view anyone else&apos;s read-only.
          </span>
        </li>
        <li className="flex gap-2">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Guests start on a demo library to try everything out (nothing is saved), and can look up any public Steam
            profile to view it read-only.
          </span>
        </li>
      </ul>
    </section>
  );
}
