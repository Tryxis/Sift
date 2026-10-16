import { ChevronDown, LogIn, LogOut, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProfileSearch } from "./ProfileSearch";
import { USING_MOCK_API } from "@/lib/api";
import { useSessionContext } from "@/hooks/useSession";

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <rect x="3" y="6" width="26" height="5" rx="2.5" fill="#4d8dff" />
      <rect x="3" y="13.5" width="19" height="5" rx="2.5" fill="#4fdcaa" />
      <rect x="3" y="21" width="12" height="5" rx="2.5" fill="#7d889b" />
    </svg>
  );
}

function SessionControls() {
  const session = useSessionContext();
  if (session?.status === "signedIn") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => session.signOut()}>
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out on this device
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => session.signOut({ everywhere: true })}>
            <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out on all devices
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  // Builds without a server have nothing to sign in to.
  if (session?.isGuest && !USING_MOCK_API) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={session.exitGuest}>
          Exit demo
        </Button>
        <Button variant="outline" size="sm" onClick={session.signIn}>
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
          Sign in with Steam
        </Button>
      </div>
    );
  }
  return null;
}

export function AppHeader({ showSearch, onSearch, isBusy }) {
  const session = useSessionContext();
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-xl tracking-tight">Sift</span>
        {session?.isGuest && (
          <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted-foreground" title="Demo data. Changes reset when you leave.">
            Guest demo
          </span>
        )}
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
        {showSearch && (
          <ProfileSearch
            onSubmit={onSearch}
            isBusy={isBusy}
            placeholder={session?.isGuest ? "Look up any Steam profile" : undefined}
            className="w-full sm:w-80"
          />
        )}
        <SessionControls />
      </div>
    </header>
  );
}
