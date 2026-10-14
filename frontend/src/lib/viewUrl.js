import { DEFAULT_CONFIGURATION } from "@/hooks/useGameFilters";
import { hasBound } from "./filters";

// The current filters live in the URL (?view=…) so a view can be bookmarked or shared.
const PARAM = "view";

function minimal(configuration) {
  const out = {};
  Object.entries(configuration).forEach(([key, value]) => {
    if (key === "reviewScoreOrder") return;
    if (key === "activeFilters") {
      const filters = Object.fromEntries(Object.entries(value ?? {}).filter(([, bounds]) => hasBound(bounds)));
      if (Object.keys(filters).length) out.activeFilters = filters;
      return;
    }
    const fallback = DEFAULT_CONFIGURATION[key];
    const isDefault = Array.isArray(fallback) ? !value?.length : value === fallback || (value == null && fallback == null);
    if (!isDefault) out[key] = value;
  });
  return out;
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded) {
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function readViewFromUrl() {
  try {
    const encoded = new URLSearchParams(window.location.search).get(PARAM);
    if (!encoded) return null;
    const parsed = JSON.parse(fromBase64Url(encoded));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeViewToUrl(configuration) {
  try {
    const url = new URL(window.location.href);
    const compact = minimal(configuration);
    if (Object.keys(compact).length) url.searchParams.set(PARAM, toBase64Url(JSON.stringify(compact)));
    else url.searchParams.delete(PARAM);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  } catch {
    /* sandboxed environments may block history; not essential */
  }
}

export function clearViewFromUrl() {
  writeViewToUrl({});
}
