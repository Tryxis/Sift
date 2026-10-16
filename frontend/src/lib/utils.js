import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** An https:// link from upstream data, or null. Keeps javascript: and other schemes out of href. */
export function safeExternalUrl(url) {
  return typeof url === "string" && /^https:\/\//i.test(url) ? url : null;
}
