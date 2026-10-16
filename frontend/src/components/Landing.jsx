import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSearch } from "./ProfileSearch";

// How long to keep showing the loading state before deciding the library didn't load,
// unless an error arrives sooner.
const GRACE_MS = 8000;

/** Shown while the first library loads, or if it couldn't be loaded (the error banner says why). */
export function Landing({ onSearch, onLoadHome, isBusy, hasError }) {
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGraceOver(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (isBusy || (!hasError && !graceOver)) {
    return (
      <section
        className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <p role="status" className="font-display text-3xl font-light tracking-tight text-muted-foreground">
          Loading library…
        </p>
        <p className="text-sm text-muted-foreground">Fetching from Steam can take a few seconds.</p>
      </section>
    );
  }

  return (
    <section className="relative z-10 flex min-h-[60vh] flex-col justify-center py-16">
      <h1 className="max-w-3xl font-display text-4xl font-light leading-[1.05] tracking-tight md:text-6xl">
        Your library didn&apos;t load.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
        Steam only shares a library when the profile&apos;s game details are public. You can try again, or
        look up someone else&apos;s profile to view it read-only.
      </p>
      <Button onClick={onLoadHome} className="mt-8 h-11 self-start px-6">
        Try again
      </Button>
      <ProfileSearch onSubmit={onSearch} isBusy={isBusy} size="large" className="mt-8 max-w-xl" />
    </section>
  );
}
