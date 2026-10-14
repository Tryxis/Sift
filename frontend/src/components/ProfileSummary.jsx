import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";

function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-border-strong object-cover sm:h-16 sm:w-16" />;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted font-display text-xl text-muted-foreground sm:h-16 sm:w-16 sm:text-2xl">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ProfileSummary({ profile, onResync, isSyncing, actions }) {
  return (
    <section className="relative z-10 flex flex-wrap items-end justify-between gap-4 pb-5 pt-2 sm:gap-6 sm:pb-8 sm:pt-6">
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <Avatar url={profile.avatarUrl} name={profile.personaName} />
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-light tracking-tight sm:text-4xl md:text-5xl">{profile.personaName}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-1.5">
            {profile.gameCount.toLocaleString()} games, synced {formatRelativeTime(profile.lastSyncedUtc)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {profile.profileUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={profile.profileUrl} target="_blank" rel="noreferrer">
              Open on Steam
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onResync} disabled={isSyncing}>
          {isSyncing ? "Syncing…" : "Sync now"}
        </Button>
        {actions}
      </div>
      {!profile.isLibraryVisible && (
        <p className="w-full rounded-card border border-border-strong bg-card px-4 py-3 text-sm text-muted-foreground">
          This profile&apos;s game details are private, so Steam didn&apos;t return a library. The owner can
          change this under Steam &gt; Edit Profile &gt; Privacy Settings &gt; Game details.
        </p>
      )}
    </section>
  );
}
