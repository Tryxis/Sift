import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeExternalUrl } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

function Avatar({ url, name }) {
  if (url) return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-border-strong object-cover sm:h-16 sm:w-16" />;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted font-display text-xl text-muted-foreground sm:h-16 sm:w-16 sm:text-2xl">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ProfileSummary({ profile, onResync, isSyncing, readOnly = false, onGoHome, homeLabel = "My library", actions }) {
  return (
    <section className="relative z-10 flex flex-wrap items-end justify-between gap-4 pb-5 pt-2 sm:gap-6 sm:pb-8 sm:pt-6">
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <Avatar url={profile.avatarUrl} name={profile.personaName} />
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-light tracking-tight sm:text-4xl md:text-5xl">{profile.personaName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:mt-1.5">
            <span>{profile.gameCount.toLocaleString()} games, synced {formatRelativeTime(profile.lastSyncedUtc)}</span>
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-xs" title="Only the owner can change this library">
                <Eye className="h-3 w-3" aria-hidden="true" />
                Read-only
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {readOnly && onGoHome && (
          <Button variant="outline" size="sm" onClick={onGoHome} disabled={isSyncing}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {homeLabel}
          </Button>
        )}
        {safeExternalUrl(profile.profileUrl) && (
          <Button variant="ghost" size="sm" asChild>
            <a href={safeExternalUrl(profile.profileUrl)} target="_blank" rel="noreferrer">
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
