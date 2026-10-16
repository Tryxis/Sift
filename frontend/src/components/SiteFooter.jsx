import { Coffee } from "lucide-react";

const KO_FI_URL = "https://ko-fi.com/davidbtryxis";

/** A quiet sign-off on every page, with an optional way to support the project. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 flex flex-col items-center gap-3 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
      <p>Sift is free, ad-free and not affiliated with Valve or Steam.</p>
      <a
        href={KO_FI_URL}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:text-foreground"
      >
        <Coffee className="h-3.5 w-3.5 text-[#FF5E5B]/80 transition-colors group-hover:text-[#FF5E5B]" aria-hidden="true" />
        Enjoying Sift? Buy me a coffee
        <span className="sr-only"> on Ko-fi (opens in a new tab)</span>
      </a>
    </footer>
  );
}
