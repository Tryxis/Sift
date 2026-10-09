// Fallback cover when Steam has no header image: a muted tone picked from a
// hash of the app id, so the same game always gets the same colour.
const TONES = [
  "from-[#1e2d52] to-[#10152a]", // plasma navy
  "from-[#33204a] to-[#150f22]", // nebula violet
  "from-[#153a31] to-[#0c1a17]", // aurora deep
  "from-[#45222c] to-[#1c1014]", // ember
  "from-[#173645] to-[#0d171d]", // ice
  "from-[#2a2e3a] to-[#12141a]", // steel
];

export function coverTone(appId) {
  const hash = Math.imul(appId, 2654435761) >>> 0;
  return TONES[hash % TONES.length];
}
