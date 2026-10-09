import { ProfileSearch } from "./ProfileSearch";
import { USING_MOCK_API } from "@/lib/api";

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <rect x="3" y="6" width="26" height="5" rx="2.5" fill="#4d8dff" />
      <rect x="3" y="13.5" width="19" height="5" rx="2.5" fill="#4fdcaa" />
      <rect x="3" y="21" width="12" height="5" rx="2.5" fill="#7d889b" />
    </svg>
  );
}

export function AppHeader({ showSearch, onSearch, isBusy }) {
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-xl tracking-tight">Sift</span>
        {USING_MOCK_API && (
          <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted-foreground">
            Demo data
          </span>
        )}
      </div>
      {showSearch && <ProfileSearch onSubmit={onSearch} isBusy={isBusy} className="w-full sm:max-w-sm" />}
    </header>
  );
}
