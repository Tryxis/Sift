import { ProfileSearch } from "./ProfileSearch";

export function Landing({ onSearch, isBusy }) {
  return (
    <section className="relative z-10 flex min-h-[60vh] flex-col justify-center py-16">
      <h1 className="max-w-3xl font-display text-5xl font-light leading-[1.05] tracking-tight md:text-7xl">
        Sift through the pile.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Look up your Steam profile, then sort every game into what you&apos;re playing, what you&apos;ve
        finished, and what you&apos;re letting go.
      </p>
      <ProfileSearch onSubmit={onSearch} isBusy={isBusy} size="large" className="mt-10 max-w-xl" />
      <p className="mt-3 text-sm text-muted-foreground">
        The profile&apos;s game details need to be public on Steam.
      </p>
    </section>
  );
}
