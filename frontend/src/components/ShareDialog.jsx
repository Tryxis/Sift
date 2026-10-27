import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatHours } from "@/lib/format";
import {
  DEFAULT_THEME, SHARE_FONTS_URL, SHARE_FORMATS, SHARE_THEMES,
  coverUrls, drawShareCard, loadFirstImage, loadThemeFonts,
} from "@/lib/shareCard";
import { getStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

const SETTINGS_KEY = "sift:share";

const OPTIONS = [
  ["status", "Status"],
  ["hours", "Hours played"],
  ["playedBefore", "Played before"],
  ["finishedHours", "Finished in"],
  ["achievements", "Achievements"],
  ["timeToBeat", "Time to beat"],
  ["note", "My note"],
  ["profile", "My Steam name"],
];

const DEFAULT_SETTINGS = {
  format: "post",
  theme: DEFAULT_THEME,
  options: { status: true, hours: true, playedBefore: true, finishedHours: true, achievements: true, timeToBeat: false, note: false, profile: true },
};

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    return stored ? { ...DEFAULT_SETTINGS, ...stored, options: { ...DEFAULT_SETTINGS.options, ...stored.options } } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* not essential */
  }
}

/** The extra display faces are only needed here, so they load the first time the panel opens. */
function ensureShareFonts() {
  if (document.getElementById("sift-share-fonts")) return;
  const link = document.createElement("link");
  link.id = "sift-share-fonts";
  link.rel = "stylesheet";
  link.href = SHARE_FONTS_URL;
  document.head.appendChild(link);
}

/** Which options have something to show for this game. */
function availability(game) {
  return {
    status: true,
    hours: true,
    playedBefore: Boolean(game.playedBefore),
    finishedHours: game.finishedHours != null,
    achievements: Boolean(game.achievementsTotal),
    timeToBeat: game.timeToBeatMainMinutes != null,
    note: Boolean(game.notes?.trim()),
    profile: true,
  };
}

/** The card's text, ready to draw: only the options that are on and have a value. */
export function buildShareContent(game, options, profileName) {
  const has = availability(game);
  const on = (key) => options[key] && has[key];
  const status = getStatusMeta(game.status);
  return {
    title: game.name,
    badges: [
      on("status") && { label: status.label, color: status.hex },
      on("playedBefore") && { label: "Played before", color: null },
    ].filter(Boolean),
    stats: [
      on("hours") && { value: formatHours(game.playtimeForeverMinutes), label: "Played" },
      on("finishedHours") && { value: formatHours(Math.round(game.finishedHours * 60)), label: "To finish" },
      on("achievements") && { value: `${game.achievementsUnlocked ?? 0}/${game.achievementsTotal}`, label: "Achievements" },
      on("timeToBeat") && { value: formatHours(game.timeToBeatMainMinutes), label: "Main story" },
    ].filter(Boolean),
    note: on("note") ? game.notes.trim() : null,
    byline: on("profile") ? profileName : null,
    site: window.location.host,
  };
}

function fileName(game, format) {
  const slug = game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `app-${game.appId}`;
  return `sift-${slug}-${format}.png`;
}

function ThemeSwatch({ theme }) {
  const [a, b, c] = theme.swatch;
  const background = a === "conic"
    ? "conic-gradient(from 200deg, #ff5a78, #f4a261, #4fdcaa, #38c9ff, #8b5cf6, #ff5a78)"
    : `linear-gradient(135deg, ${a} 0 55%, ${b} 55% 78%, ${c} 78%)`;
  return <span className="block h-9 w-full rounded-well border border-border-strong" style={{ background }} aria-hidden="true" />;
}

function ShareBody({ game, profileName }) {
  const toast = useToast();
  const [settings, setSettings] = useState(readSettings);
  const [art, setArt] = useState(undefined); // undefined while loading, null when there's none
  const [isDrawing, setIsDrawing] = useState(true);
  const [file, setFile] = useState(null);
  const canvasRef = useRef(null);
  const has = useMemo(() => availability(game), [game]);
  const content = useMemo(() => buildShareContent(game, settings.options, profileName), [game, settings.options, profileName]);
  const canShareFiles = typeof navigator !== "undefined" && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });

  const update = (patch) => setSettings((current) => {
    const next = { ...current, ...patch };
    writeSettings(next);
    return next;
  });

  useEffect(() => {
    ensureShareFonts();
    let cancelled = false;
    loadFirstImage(coverUrls(game.appId, game.headerImageUrl)).then((image) => !cancelled && setArt(image));
    return () => {
      cancelled = true;
    };
  }, [game.appId, game.headerImageUrl]);

  // Redraw on every change, then render the PNG straight away: Safari only allows sharing from
  // the click itself, with no waiting in between.
  useEffect(() => {
    if (art === undefined) return undefined;
    let cancelled = false;
    setIsDrawing(true);
    setFile(null);
    loadThemeFonts(settings.theme).then(() => {
      if (cancelled || !canvasRef.current) return;
      const canvas = drawShareCard(canvasRef.current, { format: settings.format, themeId: settings.theme, content, art });
      setIsDrawing(false);
      try {
        canvas.toBlob((blob) => {
          if (!cancelled && blob) setFile(new File([blob], fileName(game, settings.format), { type: "image/png" }));
        }, "image/png");
      } catch {
        // A cover served without CORS taints the canvas; the preview still shows, but can't be saved.
        toast.show({ message: "This cover can't be exported. Try again later." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [art, content, settings.format, settings.theme, game, toast]);

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = () => {
    if (!file) return;
    navigator.share({ files: [file], title: game.name }).catch((error) => {
      if (error.name !== "AbortError") toast.show({ message: `Couldn't share: ${error.message}` });
    });
  };

  const { width, height } = SHARE_FORMATS[settings.format];

  return (
    <div className="grid min-h-0 overflow-y-auto overscroll-contain sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex items-center justify-center bg-abyss p-4 sm:p-6">
        <div className="relative w-full" style={{ maxWidth: `min(100%, calc(62dvh * ${width / height}))` }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={cn("block h-auto w-full rounded-well shadow-[0_12px_40px_hsl(220_33%_2%/0.7)] transition-opacity", isDrawing && "opacity-60")}
            role="img"
            aria-label={`Share image preview for ${game.name}`}
          />
          {(art === undefined || isDrawing) && (
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <DialogTitle className="font-display text-xl font-light tracking-tight">Share {game.name}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">Sized for Instagram. Pick a look and what to show.</DialogDescription>
        </div>

        <fieldset>
          <legend className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Format</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(SHARE_FORMATS).map(([id, format]) => (
              <button
                key={id}
                type="button"
                aria-pressed={settings.format === id}
                onClick={() => update({ format: id })}
                className={cn(
                  "flex items-center gap-3 rounded-well border px-3 py-2 text-left text-sm transition-colors",
                  settings.format === id ? "border-foreground/70 bg-muted" : "border-border-strong hover:border-muted-foreground/60"
                )}
              >
                <span
                  className="shrink-0 rounded-[3px] border-2 border-current opacity-80"
                  style={{ width: id === "post" ? 16 : 13, height: id === "post" ? 20 : 23 }}
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium">{format.label}</span>
                  <span className="block text-xs text-muted-foreground">{format.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SHARE_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={settings.theme === theme.id}
                onClick={() => update({ theme: theme.id })}
                className={cn(
                  "rounded-well border p-1.5 text-left text-xs transition-colors",
                  settings.theme === theme.id ? "border-foreground/70 bg-muted" : "border-border-strong hover:border-muted-foreground/60"
                )}
              >
                <ThemeSwatch theme={theme} />
                <span className="mt-1 block truncate px-0.5">{theme.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Show</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OPTIONS.map(([key, label]) => {
              const checked = Boolean(settings.options[key]);
              return (
                <button
                  key={key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked && has[key]}
                  disabled={!has[key]}
                  title={has[key] ? undefined : "Nothing to show for this game"}
                  onClick={() => update({ options: { ...settings.options, [key]: !checked } })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors disabled:opacity-40",
                    checked && has[key] ? "border-foreground/60 bg-muted text-foreground" : "border-border-strong text-muted-foreground hover:text-foreground"
                  )}
                >
                  {checked && has[key] && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {label}
                </button>
              );
            })}
          </div>
          {settings.options.note && has.note && game.notesPrivate && (
            <p className="mt-2 text-xs text-status-problem">This note is private. It&apos;ll be visible to anyone you share the image with.</p>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-1">
          {canShareFiles && (
            <Button onClick={share} disabled={!file}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
          )}
          <Button variant={canShareFiles ? "outline" : "default"} onClick={download} disabled={!file}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PNG
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {width} × {height}px.{canShareFiles ? " Share opens your phone's share sheet, where you can pick Instagram." : " Save it, then post it from your phone."}
        </p>
      </div>
    </div>
  );
}

export function ShareDialog({ game, profileName, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        {open && game && <ShareBody key={game.appId} game={game} profileName={profileName} />}
      </DialogContent>
    </Dialog>
  );
}
