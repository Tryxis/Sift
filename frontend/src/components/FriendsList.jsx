import { useState } from "react";
import { ExternalLink, GitCompareArrows, Pencil, Star, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { displayName, useFavourites } from "@/hooks/useFavourites";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { useRecentProfiles } from "@/lib/recentProfiles";
import { cn } from "@/lib/utils";

const ALIAS_MAX = 40;

export function ProfileAvatar({ src, className }) {
  return src ? (
    <img src={src} alt="" className={cn("h-9 w-9 shrink-0 rounded-full border border-border-strong", className)} />
  ) : (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted", className)}>
      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </span>
  );
}

/** Star toggle for a profile; starring opens the alias editor so a friend can be named straight away. */
export function FavouriteButton({ ownerSteamId, profile, onStarred, size = "icon" }) {
  const { find, save, remove } = useFavourites(ownerSteamId);
  const toast = useToast();
  const favourite = find(profile.steamId);
  const name = displayName(profile, favourite);

  const toggle = async () => {
    try {
      if (favourite) {
        await remove(profile.steamId);
        toast.show({ message: `Removed ${name} from favourites`, action: { label: "Undo", onClick: () => save(profile, favourite.alias) } });
      } else {
        await save(profile, null);
        onStarred?.(profile.steamId);
      }
    } catch (error) {
      toast.show({ message: `Couldn't update favourites: ${error.message}` });
    }
  };

  return (
    <Button
      variant={size === "icon" ? "ghost" : "outline"}
      size={size}
      onClick={toggle}
      aria-pressed={Boolean(favourite)}
      aria-label={favourite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      title={favourite ? "Favourite: their public notes show on your games" : "Favourite to see their public notes on your games"}
    >
      <Star className={cn("h-4 w-4", favourite && "fill-status-problem text-status-problem")} aria-hidden="true" />
      {size !== "icon" && (favourite ? "Favourite" : "Add to favourites")}
    </Button>
  );
}

function AliasEditor({ profile, favourite, onSave, onCancel }) {
  const [value, setValue] = useState(favourite?.alias ?? "");
  return (
    <form
      className="flex min-w-0 flex-1 gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <label htmlFor={`alias-${profile.steamId}`} className="sr-only">Alias for {profile.personaName}</label>
      <Input
        id={`alias-${profile.steamId}`}
        autoFocus
        value={value}
        maxLength={ALIAS_MAX}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        placeholder={`Alias, e.g. "Sam from work"`}
        className="h-8 min-w-0 text-base sm:text-sm"
      />
      <Button type="submit" size="sm">Save</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function ProfileRow({ ownerSteamId, profile, detail, isActive, isEditing, onEdit, onCompare, onOpen, onForget }) {
  const { find, save } = useFavourites(ownerSteamId);
  const toast = useToast();
  const favourite = find(profile.steamId);
  const name = displayName(profile, favourite);

  const saveAlias = async (alias) => {
    onEdit(null);
    try {
      await save(profile, alias);
    } catch (error) {
      toast.show({ message: `Couldn't save the alias: ${error.message}` });
    }
  };

  return (
    <li className={cn("flex items-center gap-3 py-2", isActive && "-mx-2 rounded-well bg-muted/60 px-2")}>
      <ProfileAvatar src={profile.avatarUrl ?? favourite?.avatarUrl} />
      {isEditing ? (
        <AliasEditor profile={profile} favourite={favourite} onSave={saveAlias} onCancel={() => onEdit(null)} />
      ) : (
        <>
          <button type="button" onClick={() => onCompare(profile.steamId)} className="min-w-0 flex-1 text-left" title={`Compare with ${name}`}>
            <span className="block truncate text-sm font-medium hover:underline">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {favourite?.alias && profile.personaName ? `${profile.personaName} · ` : ""}
              {detail}
            </span>
          </button>
          <div className="flex shrink-0 items-center">
            {favourite && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(profile.steamId)} aria-label={`Edit alias for ${name}`} title="Edit alias">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            <FavouriteButton ownerSteamId={ownerSteamId} profile={profile} onStarred={onEdit} />
            <Button variant="ghost" size="icon" onClick={() => onCompare(profile.steamId)} aria-label={`Compare with ${name}`} title="Compare" className="hidden sm:inline-flex">
              <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
            </Button>
            {onOpen && (
              <Button variant="ghost" size="icon" onClick={() => onOpen(profile.steamId)} aria-label={`Open ${name}'s library`} title="Open their library">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            {onForget && (
              <Button variant="ghost" size="icon" onClick={() => onForget(profile.steamId)} aria-label={`Remove ${name} from recent`} title="Remove from recent">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

function Group({ title, detail, children }) {
  return (
    <section className="min-w-0">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      <ul className="mt-1 divide-y divide-border">{children}</ul>
    </section>
  );
}

/**
 * Favourites (saved to the account, with aliases) and recently viewed profiles (this device),
 * for picking someone to compare with or open.
 */
export function FriendsList({ ownerSteamId, activeSteamId, onCompare, onOpen }) {
  const { favourites } = useFavourites(ownerSteamId);
  const { recent, forget } = useRecentProfiles(ownerSteamId);
  const [editing, setEditing] = useState(null);
  const favouriteIds = new Set(favourites.map((item) => item.steamId));
  const recentOnly = recent.filter((item) => !favouriteIds.has(item.steamId));
  const sortedFavourites = [...favourites].sort((a, b) => displayName(a, a).localeCompare(displayName(b, b)));

  if (!favourites.length && !recentOnly.length) return null;

  const rowProps = (profile) => ({
    ownerSteamId,
    profile,
    isActive: profile.steamId === activeSteamId,
    isEditing: editing === profile.steamId,
    onEdit: setEditing,
    onCompare,
    onOpen,
  });

  return (
    <div className="grid gap-x-8 gap-y-5 rounded-card border border-border bg-card p-4 sm:p-5 lg:grid-cols-2">
      {favourites.length > 0 && (
        <Group title="Favourites" detail="Their public notes show on your games.">
          {sortedFavourites.map((favourite) => (
            <ProfileRow key={favourite.steamId} {...rowProps(favourite)} detail={`Favourite since ${formatDate(favourite.addedUtc, { short: true })}`} />
          ))}
        </Group>
      )}
      {recentOnly.length > 0 && (
        <Group title="Recent" detail="Profiles you've looked up on this device.">
          {recentOnly.map((profile) => (
            <ProfileRow
              key={profile.steamId}
              {...rowProps(profile)}
              detail={`Viewed ${formatRelativeTime(profile.viewedUtc)}`}
              onForget={forget}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
