import { Button } from "@/components/ui/button";
import { ProfileSearch } from "./ProfileSearch";

/** Shown while the first library loads, or if it couldn't be loaded (the error banner says why). */
export function Landing({ onSearch, onLoadHome, isBusy }) {
  if (isBusy) {
    return (
      <section className="relative z-10 flex min-h-[60vh] flex-col justify-center py-16" aria-busy="true">
        <p className="font-display text-3xl font-light tracking-tight text-muted-foreground">Loading your library…</p>
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
