// Share images: a game's cover and a few of your stats, drawn on a canvas in one of several themes
// and sized for Instagram. Plain canvas code with no app imports: the caller turns a game into
// ready-to-print strings (see buildShareContent in ShareDialog) and this only lays them out.

export const SHARE_FORMATS = {
  post: { label: "Post", detail: "4:5 feed post", width: 1080, height: 1350 },
  story: { label: "Story", detail: "9:16 story", width: 1080, height: 1920 },
};

/** Display faces some themes use beyond the app's own; loaded only when the share panel opens. */
export const SHARE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Audiowide&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;700&display=swap";

const SANS = '"Manrope", system-ui, sans-serif';
const GROTESK = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';
const SERIF = '"Fraunces", Georgia, serif';
const RETRO = '"Audiowide", "Space Grotesk", sans-serif';

// ---------------------------------------------------------------- drawing helpers

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

function setSpacing(ctx, px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
}

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function ellipsize(ctx, text, maxWidth, force = false) {
  if (!force && ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Splits text into at most `maxLines` lines that fit `maxWidth`, ending in an ellipsis if cut. */
function wrapLines(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  const kept = lines.slice(0, maxLines).map((l) => ellipsize(ctx, l, maxWidth));
  if (lines.length > maxLines) kept[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth, true);
  return kept;
}

/** The largest title size (stepping down to `min`) whose wrap fits in `maxLines`. */
function fitTitle(ctx, text, font, maxWidth, maxLines, max, min) {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = font(size);
    const words = text.split(/\s+/);
    // A single word wider than the line would only fit by being cut, so keep shrinking.
    if (words.some((word) => ctx.measureText(word).width > maxWidth) && size > min) continue;
    const lines = wrapLines(ctx, text, maxWidth, maxLines + 1);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(min);
  return { size: min, lines: wrapLines(ctx, text, maxWidth, maxLines) };
}

function offscreen(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

/** A cheap, Safari-safe blur: draw tiny, then let smoothing stretch it back up. */
function blurred(img, w, h, strength = 28) {
  const small = offscreen(w / strength, h / strength);
  const sctx = small.getContext("2d");
  coverFit(sctx, img, 0, 0, small.width, small.height);
  return small;
}

/** Draws `img` filling the box (cropping the overflow), like CSS object-fit: cover. */
function coverFit(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth ?? img.width;
  const ih = img.naturalHeight ?? img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The cover recoloured per pixel: grayscale, or a two-colour duotone from `dark` to `light`. */
function recoloured(img, mode, dark, light) {
  try {
    return recolouredPixels(img, mode, dark, light);
  } catch {
    return img; // a cross-origin image without CORS can't be read; show it as it is
  }
}

function recolouredPixels(img, mode, dark, light) {
  const canvas = offscreen(img.naturalWidth ?? img.width, img.naturalHeight ?? img.height);
  const cctx = canvas.getContext("2d");
  cctx.drawImage(img, 0, 0);
  const data = cctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const [dr, dg, db] = dark ? hexToRgb(dark) : [0, 0, 0];
  const [lr, lg, lb] = light ? hexToRgb(light) : [255, 255, 255];
  for (let i = 0; i < px.length; i += 4) {
    let t = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    if (mode === "grayscale") t = Math.min(1, Math.max(0, (t - 0.5) * 1.15 + 0.5)); // a touch of contrast
    px[i] = dr + (lr - dr) * t;
    px[i + 1] = dg + (lg - dg) * t;
    px[i + 2] = db + (lb - db) * t;
  }
  cctx.putImageData(data, 0, 0);
  return canvas;
}

/** The cover's most characterful colour as [hue, saturation, lightness] (0–360, 0–1, 0–1). */
export function dominantHue(img) {
  if (!img) return [220, 0.5, 0.5];
  try {
    return dominantHuePixels(img);
  } catch {
    return [220, 0.5, 0.5];
  }
}

function dominantHuePixels(img) {
  const canvas = offscreen(24, 36);
  const cctx = canvas.getContext("2d", { willReadFrequently: true });
  coverFit(cctx, img, 0, 0, 24, 36);
  const px = cctx.getImageData(0, 0, 24, 36).data;
  let x = 0;
  let y = 0;
  let weight = 0;
  let sat = 0;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255;
    const g = px[i + 1] / 255;
    const b = px[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const s = max === 0 ? 0 : (max - min) / max;
    if (max - min < 0.04) continue;
    let h;
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    const angle = (h * 60 * Math.PI) / 180;
    // Vivid, mid-bright pixels decide the hue; washed-out and near-black ones barely count.
    const w = s * s * max;
    x += Math.cos(angle) * w;
    y += Math.sin(angle) * w;
    weight += w;
    sat += s * w;
  }
  if (!weight) return [220, 0.1, 0.5];
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return [hue, Math.min(0.85, sat / weight), 0.5];
}

const hsl = (h, s, l, a = 1) => `hsla(${h.toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${a})`;

function drawLogo(ctx, x, y, size, colors) {
  const u = size / 32;
  [[6, 26], [13.5, 19], [21, 12]].forEach(([top, width], i) => {
    ctx.fillStyle = colors[i];
    roundRect(ctx, x + 3 * u, y + top * u, width * u, 5 * u, 2.5 * u);
    ctx.fill();
  });
}

// ---------------------------------------------------------------- themes
//
// Each theme sets colours, faces and a few switches the shared layout reads, plus optional hooks:
//   background(ctx, W, H, art, frame)  paints behind everything
//   cover(img) → image                 recolours the cover before it's drawn
//   overlay(ctx, W, H, frame)          paints over everything (scanlines, grain)
// `frame` carries the computed layout (cover box, content top) so decoration can line up with it.

function nebula(ctx, W, H, stops) {
  stops.forEach(([cx, cy, r, color]) => {
    const g = ctx.createRadialGradient(cx * W, cy * H, 0, cx * W, cy * H, r * W);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

function stars(ctx, W, H, count, color, seed, maxY = H) {
  const random = seeded(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const r = random() < 0.9 ? 1.4 : 2.6;
    ctx.globalAlpha = 0.25 + random() * 0.6;
    ctx.beginPath();
    ctx.arc(random() * W, random() * maxY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function grain(ctx, W, H, color, amount, seed = 7) {
  const random = seeded(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < amount; i++) ctx.fillRect(random() * W, random() * H, 2, 2);
}

export const SHARE_THEMES = [
  {
    id: "sift",
    label: "Sift",
    swatch: ["#0b0e13", "#4d8dff", "#4fdcaa"],
    align: "center",
    text: "#e9ecf2",
    muted: "#8b93a3",
    accent: "#4d8dff",
    titleFont: (s) => `300 ${s}px ${GROTESK}`,
    labelFont: (s) => `600 ${s}px ${SANS}`,
    valueFont: (s) => `400 ${s}px ${GROTESK}`,
    noteFont: (s) => `400 ${s}px ${SANS}`,
    stats: "tiles",
    tile: { fill: "rgba(17, 21, 28, 0.82)", stroke: "#2c303b", radius: 24 },
    pill: { shape: "pill", tint: 0.16 },
    coverRadius: 28,
    coverStroke: "rgba(233, 236, 242, 0.12)",
    coverShadow: "rgba(4, 6, 10, 0.75)",
    logo: ["#4d8dff", "#4fdcaa", "#7d889b"],
    background(ctx, W, H, art) {
      ctx.fillStyle = "#0b0e13";
      ctx.fillRect(0, 0, W, H);
      if (art) {
        ctx.globalAlpha = 0.22;
        ctx.drawImage(blurred(art, W, H), 0, 0, W, H * 0.7);
        ctx.globalAlpha = 1;
        const fade = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.72);
        fade.addColorStop(0, "rgba(11, 14, 19, 0)");
        fade.addColorStop(1, "#0b0e13");
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, W, H);
      }
      nebula(ctx, W, H, [
        [0.18, 0.12, 0.6, "hsla(252, 90%, 60%, 0.30)"],
        [0.85, 0.05, 0.55, "hsla(219, 100%, 60%, 0.22)"],
        [0.6, 0.85, 0.6, "hsla(170, 70%, 50%, 0.10)"],
      ]);
      stars(ctx, W, H, 70, "#e9ecf2", 3);
    },
  },
  {
    id: "synthwave",
    label: "Synthwave",
    swatch: ["#1a0536", "#ff2975", "#2de2e6"],
    align: "center",
    text: "#fdf2ff",
    muted: "#c29ee0",
    accent: "#2de2e6",
    titleFont: (s) => `400 ${s}px ${RETRO}`,
    titleUpper: true,
    titleGradient: ["#2de2e6", "#f8b5ff", "#ff2975"],
    titleGlow: "rgba(255, 41, 117, 0.65)",
    labelFont: (s) => `700 ${s}px ${SANS}`,
    valueFont: (s) => `400 ${s}px ${RETRO}`,
    noteFont: (s) => `500 ${s}px ${SANS}`,
    stats: "tiles",
    tile: { fill: "rgba(26, 5, 54, 0.72)", stroke: "#2de2e6", radius: 6, glow: "rgba(45, 226, 230, 0.55)" },
    pill: { shape: "rect", tint: 0.12, glow: true, upper: true, text: "#ffd6ea" },
    badgeColor: () => "#ff2975",
    coverRadius: 6,
    coverStroke: "#ff2975",
    coverStrokeWidth: 4,
    coverShadow: "rgba(255, 41, 117, 0.55)",
    logo: ["#2de2e6", "#ff2975", "#f8b500"],
    background(ctx, W, H, art, frame) {
      const horizon = frame.cover.y + frame.cover.h * 0.78;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#0d0221");
      sky.addColorStop(0.55, "#261447");
      sky.addColorStop(1, "#6b1360");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizon);
      stars(ctx, W, H, 90, "#ffffff", 11, horizon * 0.7);

      // The sun sits behind the cover and shows either side of it.
      const r = Math.min(W * 0.46, frame.cover.h * 0.62);
      const cx = W / 2;
      const cy = horizon - r * 0.55;
      const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      sun.addColorStop(0, "#ffd319");
      sun.addColorStop(0.5, "#ff901f");
      sun.addColorStop(1, "#ff2975");
      ctx.save();
      ctx.shadowColor = "rgba(255, 41, 117, 0.8)";
      ctx.shadowBlur = 90;
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Classic stripes cut through the lower half of the sun.
      ctx.fillStyle = "#4a0f55";
      for (let i = 0; i < 7; i++) {
        const y = cy + r * (0.08 + i * 0.13);
        ctx.fillRect(cx - r, y, r * 2, 4 + i * 2.6);
      }

      const floor = ctx.createLinearGradient(0, horizon, 0, H);
      floor.addColorStop(0, "#2a0845");
      floor.addColorStop(1, "#090014");
      ctx.fillStyle = floor;
      ctx.fillRect(0, horizon, W, H - horizon);

      // Perspective grid: rows bunch toward the horizon, columns meet at its centre.
      ctx.save();
      ctx.strokeStyle = "rgba(255, 41, 117, 0.55)";
      ctx.shadowColor = "#ff2975";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      for (let i = 1; i <= 16; i++) {
        const y = horizon + (H - horizon) * (i / 16) ** 2.1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 22, horizon);
        ctx.lineTo(cx + i * 260, H);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#ff2975";
      ctx.fillRect(0, horizon - 2, W, 4);

      // Keep the text legible over the grid.
      const shade = ctx.createLinearGradient(0, frame.contentTop - 40, 0, H);
      shade.addColorStop(0, "rgba(9, 0, 20, 0)");
      shade.addColorStop(0.18, "rgba(9, 0, 20, 0.55)");
      shade.addColorStop(1, "rgba(9, 0, 20, 0.7)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, frame.contentTop - 40, W, H);
    },
  },
  {
    id: "mono",
    label: "Monochrome",
    swatch: ["#0a0a0a", "#ffffff", "#7a7a7a"],
    align: "center",
    text: "#ffffff",
    muted: "#9a9a9a",
    accent: "#ffffff",
    titleFont: (s) => `500 ${s}px ${GROTESK}`,
    titleUpper: true,
    titleSpacing: -1,
    labelFont: (s) => `600 ${s}px ${SANS}`,
    valueFont: (s) => `300 ${s}px ${GROTESK}`,
    noteFont: (s) => `400 ${s}px ${SANS}`,
    stats: "columns",
    rule: "rgba(255, 255, 255, 0.28)",
    pill: { shape: "rect", tint: 0, upper: true },
    badgeColor: () => "#ffffff",
    coverRadius: 0,
    coverStroke: "rgba(255, 255, 255, 0.9)",
    coverStrokeWidth: 2,
    logo: ["#ffffff", "rgba(255, 255, 255, 0.66)", "rgba(255, 255, 255, 0.38)"],
    cover: (img) => recoloured(img, "grayscale"),
    background(ctx, W, H) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);
      const inset = 36;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    },
    overlay(ctx, W, H) {
      grain(ctx, W, H, "rgba(255, 255, 255, 0.05)", 9000);
    },
  },
  {
    id: "terminal",
    label: "Terminal",
    swatch: ["#030803", "#39ff6a", "#0f3d1a"],
    align: "left",
    text: "#5dff86",
    muted: "#2fa84f",
    accent: "#39ff6a",
    titleFont: (s) => `700 ${s}px ${MONO}`,
    titleGlow: "rgba(57, 255, 106, 0.55)",
    titlePrefix: "> ",
    labelFont: (s) => `400 ${s}px ${MONO}`,
    valueFont: (s) => `700 ${s}px ${MONO}`,
    noteFont: (s) => `400 ${s}px ${MONO}`,
    stats: "lines",
    headroom: 30,
    pill: { shape: "bracket", upper: true },
    badgeColor: () => "#39ff6a",
    coverRadius: 0,
    coverStroke: "#39ff6a",
    coverStrokeWidth: 3,
    coverShadow: "rgba(57, 255, 106, 0.35)",
    logo: ["#39ff6a", "#2fa84f", "#1d6b33"],
    cover: (img) => recoloured(img, "duotone", "#021006", "#7dffa0"),
    background(ctx, W, H, art, frame) {
      ctx.fillStyle = "#030803";
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.7);
      glow.addColorStop(0, "rgba(57, 255, 106, 0.10)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.font = `400 26px ${MONO}`;
      ctx.fillStyle = "#2fa84f";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("sift@steam:~$ ./share --now-playing", frame.pad, frame.cover.y - 26);
    },
    overlay(ctx, W, H) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 2);
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.6)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    swatch: ["#f3ede1", "#1b1b1b", "#c8402a"],
    align: "left",
    text: "#1b1b1b",
    muted: "#6f685c",
    accent: "#c8402a",
    titleFont: (s) => `600 ${s}px ${SERIF}`,
    titleSpacing: -1.5,
    labelFont: (s) => `700 ${s}px ${SANS}`,
    valueFont: (s) => `600 ${s}px ${SERIF}`,
    noteFont: (s) => `italic 400 ${s}px ${SERIF}`,
    noteQuote: true,
    stats: "columns",
    rule: "rgba(27, 27, 27, 0.35)",
    pill: { shape: "rect", tint: 1, upper: true },
    headroom: 40,
    badgeColor: (color, i) => (i === 0 ? "#c8402a" : "#1b1b1b"),
    coverRadius: 0,
    coverStroke: "#1b1b1b",
    coverStrokeWidth: 3,
    coverOffset: { x: 18, y: 18, color: "#c8402a" },
    logo: ["#1b1b1b", "#c8402a", "#8a8378"],
    background(ctx, W, H, art, frame) {
      ctx.fillStyle = "#f3ede1";
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, "rgba(80, 60, 30, 0.06)", 14000, 21);
      // A masthead with a thick-and-thin rule above the cover.
      const y = frame.cover.y - 54;
      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(frame.pad, y, W - frame.pad * 2, 5);
      ctx.fillRect(frame.pad, y + 11, W - frame.pad * 2, 1.5);
      ctx.font = `700 22px ${SANS}`;
      setSpacing(ctx, 5);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText("SIFT REVIEW", frame.pad, y - 16);
      ctx.textAlign = "right";
      ctx.fillStyle = "#c8402a";
      ctx.fillText(new Date().getFullYear().toString(), W - frame.pad, y - 16);
      setSpacing(ctx, 0);
    },
  },
  {
    id: "cover",
    label: "Cover colours",
    swatch: ["conic", "#ffffff", "#000000"],
    align: "center",
    adaptive: true,
    text: "#ffffff",
    muted: "rgba(255, 255, 255, 0.68)",
    titleFont: (s) => `500 ${s}px ${GROTESK}`,
    labelFont: (s) => `600 ${s}px ${SANS}`,
    valueFont: (s) => `500 ${s}px ${GROTESK}`,
    noteFont: (s) => `400 ${s}px ${SANS}`,
    stats: "tiles",
    tile: { fill: "rgba(255, 255, 255, 0.09)", stroke: "rgba(255, 255, 255, 0.18)", radius: 28 },
    pill: { shape: "pill", tint: 0.22 },
    coverRadius: 32,
    coverShadow: "rgba(0, 0, 0, 0.7)",
    background(ctx, W, H, art, frame) {
      const [h, s] = frame.hue;
      ctx.fillStyle = hsl(h, s, 0.12);
      ctx.fillRect(0, 0, W, H);
      if (art) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(blurred(art, W, H, 40), -60, -60, W + 120, H + 120);
        ctx.globalAlpha = 1;
      }
      const wash = ctx.createLinearGradient(0, 0, 0, H);
      wash.addColorStop(0, hsl(h, s, 0.1, 0.35));
      wash.addColorStop(0.5, hsl(h, s * 0.9, 0.09, 0.7));
      wash.addColorStop(1, hsl(h, s * 0.8, 0.06, 0.94));
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, W, H);
    },
  },
];

export const DEFAULT_THEME = "sift";

/** Fills in the colours an adaptive theme takes from the cover. */
function resolveTheme(theme, hue) {
  if (!theme.adaptive) return theme;
  const [h, s] = hue;
  const accent = hsl(h, Math.max(s, 0.55), 0.68);
  return { ...theme, accent, logo: [accent, "#ffffff", "rgba(255, 255, 255, 0.5)"] };
}

// ---------------------------------------------------------------- layout pieces

function drawBadges(ctx, theme, badges, x, y, h, maxWidth, align) {
  const { pill } = theme;
  const fontSize = Math.round(h * 0.42);
  ctx.font = theme.labelFont(fontSize);
  setSpacing(ctx, pill.upper ? 3 : 0.5);
  const items = badges.map((badge, i) => {
    const color = theme.badgeColor ? theme.badgeColor(badge.color, i) : badge.color ?? theme.accent;
    const label = pill.upper ? badge.label.toUpperCase() : badge.label;
    const text = pill.shape === "bracket" ? `[ ${label} ]` : label;
    const dot = pill.shape === "pill" ? h * 0.24 : 0;
    const padX = pill.shape === "bracket" ? 0 : h * 0.42;
    const width = ctx.measureText(text).width + padX * 2 + (dot ? dot + h * 0.2 : 0);
    return { color, text, dot, padX, width };
  });
  const gap = h * 0.3;
  const total = items.reduce((sum, item) => sum + item.width, 0) + gap * (items.length - 1);
  let cx = align === "center" ? x + (maxWidth - total) / 2 : x;

  items.forEach((item) => {
    ctx.save();
    if (pill.shape !== "bracket") {
      roundRect(ctx, cx, y, item.width, h, pill.shape === "pill" ? h / 2 : 4);
      if (pill.tint) {
        ctx.globalAlpha = pill.tint;
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (pill.glow) {
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 18;
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = item.color;
      ctx.stroke();
    }
    ctx.restore();
    let tx = cx + item.padX;
    if (item.dot) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(tx + item.dot / 2, y + h / 2, item.dot / 2, 0, Math.PI * 2);
      ctx.fill();
      tx += item.dot + h * 0.2;
    }
    // A solid editorial label reads in paper colour; everything else in the badge colour (or text).
    ctx.fillStyle = pill.text ?? (pill.tint === 1 ? "#f3ede1" : pill.shape === "pill" ? theme.text : item.color);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = theme.labelFont(fontSize);
    ctx.fillText(item.text, tx, y + h / 2 + 1);
    cx += item.width + gap;
  });
  setSpacing(ctx, 0);
}

function statsHeight(theme, stats, story) {
  if (!stats.length) return 0;
  if (theme.stats === "lines") return stats.length * (story ? 58 : 50);
  return story ? 176 : 150;
}

function drawStats(ctx, theme, stats, x, y, width, story, align) {
  const valueSize = story ? 56 : 48;
  const labelSize = story ? 23 : 21;

  if (theme.stats === "lines") {
    const lineH = story ? 58 : 50;
    ctx.textBaseline = "alphabetic";
    stats.forEach((stat, i) => {
      const baseline = y + i * lineH + lineH * 0.72;
      ctx.font = theme.labelFont(story ? 32 : 29);
      const label = `${stat.label.toUpperCase().replace(/\s+/g, "_")} `;
      ctx.fillStyle = theme.muted;
      ctx.textAlign = "left";
      ctx.fillText(label, x, baseline);
      const labelW = ctx.measureText(label).width;
      ctx.font = theme.valueFont(story ? 32 : 29);
      const valueW = ctx.measureText(stat.value).width;
      ctx.fillStyle = theme.text;
      ctx.textAlign = "right";
      ctx.fillText(stat.value, x + width, baseline);
      ctx.font = theme.labelFont(story ? 32 : 29);
      const dotW = ctx.measureText(".").width;
      const dots = Math.max(0, Math.floor((width - labelW - valueW - dotW) / dotW));
      ctx.fillStyle = theme.muted;
      ctx.textAlign = "left";
      ctx.fillText(".".repeat(dots), x + labelW, baseline);
    });
    return;
  }

  const gap = theme.stats === "tiles" ? 20 : 0;
  const h = statsHeight(theme, stats, story);
  // One or two stats shouldn't stretch into banners; cap the cells and line the group up with the text.
  const cellW = Math.min((width - gap * (stats.length - 1)) / stats.length, story ? 300 : 280);
  const groupW = cellW * stats.length + gap * (stats.length - 1);
  if (align === "center") x += (width - groupW) / 2;
  stats.forEach((stat, i) => {
    const cx = x + i * (cellW + gap);
    if (theme.stats === "tiles") {
      const { tile } = theme;
      ctx.save();
      roundRect(ctx, cx, y, cellW, h, tile.radius);
      ctx.fillStyle = tile.fill;
      ctx.fill();
      if (tile.glow) {
        ctx.shadowColor = tile.glow;
        ctx.shadowBlur = 16;
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = tile.stroke;
      ctx.stroke();
      ctx.restore();
    } else if (i > 0) {
      ctx.fillStyle = theme.rule;
      ctx.fillRect(cx, y + 14, 2, h - 28);
    }
    const centre = cx + cellW / 2;
    // Shrink long values to fit their cell.
    let size = stats.length > 3 ? valueSize - 8 : valueSize;
    ctx.font = theme.valueFont(size);
    while (size > 26 && ctx.measureText(stat.value).width > cellW - 28) ctx.font = theme.valueFont((size -= 2));
    ctx.fillStyle = theme.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(stat.value, centre, y + h * 0.55);
    ctx.font = theme.labelFont(labelSize);
    setSpacing(ctx, 2);
    ctx.fillStyle = theme.muted;
    const label = wrapLines(ctx, stat.label.toUpperCase(), cellW - 24, 1)[0];
    ctx.fillText(label, centre, y + h * 0.55 + labelSize * 1.9);
    setSpacing(ctx, 0);
  });
}

function drawCover(ctx, theme, image, box) {
  const { x, y, w, h } = box;
  const r = theme.coverRadius;
  if (theme.coverOffset) {
    ctx.fillStyle = theme.coverOffset.color;
    ctx.fillRect(x + theme.coverOffset.x, y + theme.coverOffset.y, w, h);
  }
  ctx.save();
  if (theme.coverShadow) {
    ctx.shadowColor = theme.coverShadow;
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 24;
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = "#11151c";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (image) {
    coverFit(ctx, image, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#1e2d52");
    g.addColorStop(1, "#10152a");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();

  if (theme.coverStroke) {
    roundRect(ctx, x, y, w, h, r);
    ctx.lineWidth = theme.coverStrokeWidth ?? 2;
    ctx.strokeStyle = theme.coverStroke;
    ctx.stroke();
  }
}

function drawFooter(ctx, theme, site, x, y, width, align) {
  const logo = 52;
  ctx.font = `400 46px ${GROTESK}`;
  const wordW = ctx.measureText("Sift").width;
  ctx.font = `500 24px ${SANS}`;
  const siteW = site ? ctx.measureText(site).width : 0;
  const groupW = logo + 14 + wordW + (site ? 28 + siteW : 0);
  let cx = align === "center" ? x + (width - groupW) / 2 : x;

  drawLogo(ctx, cx, y, logo, theme.logo);
  cx += logo + 14;
  ctx.fillStyle = theme.text;
  ctx.font = `400 46px ${GROTESK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Sift", cx, y + logo / 2 + 1);
  if (site) {
    cx += wordW + 28;
    ctx.fillStyle = theme.muted;
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(site, cx, y + logo / 2 + 3);
  }
}

// ---------------------------------------------------------------- the card

/**
 * Draws a share card onto `canvas` (resized to the format).
 * content: { title, badges: [{ label, color }], stats: [{ value, label }], note, byline, site }
 * art: the cover image (portrait art preferred), already loaded with CORS, or null.
 */
export function drawShareCard(canvas, { format = "post", themeId = DEFAULT_THEME, content, art = null }) {
  const { width: W, height: H } = SHARE_FORMATS[format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const story = format === "story";
  const hue = dominantHue(art);
  const theme = resolveTheme(SHARE_THEMES.find((t) => t.id === themeId) ?? SHARE_THEMES[0], hue);

  // Instagram covers the top ~14% and bottom ~15% of a story with its own UI, so a story keeps
  // everything important inside those margins.
  const pad = story ? 96 : 84;
  const top = story ? 250 : 96 + (theme.headroom ?? 0);
  const footerH = 52;
  const footerY = story ? H - 300 : H - 84 - footerH;
  const innerW = W - pad * 2;
  const align = theme.align;

  // Measure the text block first; the cover gets whatever height is left.
  const badgeH = story ? 60 : 54;
  const title = fitTitle(
    ctx,
    theme.titleUpper ? content.title.toUpperCase() : content.title,
    theme.titleFont,
    innerW - (theme.titlePrefix ? 60 : 0),
    2,
    story ? 92 : 80,
    story ? 50 : 44,
  );
  const titleLineH = title.size * 1.08;
  const noteSize = story ? 34 : 30;
  ctx.font = theme.noteFont(noteSize);
  const noteText = content.note ? (theme.noteQuote ? content.note : `“${content.note}”`) : null;
  const noteLines = noteText ? wrapLines(ctx, noteText, innerW - (theme.noteQuote ? 70 : 0), story ? 4 : 2) : [];
  const noteLineH = noteSize * 1.4;
  const statsH = statsHeight(theme, content.stats, story);
  const bylineSize = story ? 28 : 25;

  const gaps = { cover: story ? 64 : 52, badges: 30, title: 40, stats: 40, note: 22 };
  const blocks = [
    content.badges.length ? badgeH + gaps.badges : 0,
    title.lines.length * titleLineH,
    statsH ? gaps.title + statsH : 0,
    noteLines.length ? gaps.stats + noteLines.length * noteLineH : 0,
    content.byline ? gaps.note + bylineSize * 1.5 : 0,
  ];
  const textH = blocks.reduce((a, b) => a + b, 0);
  const bottom = footerY - (story ? 70 : 56);

  // Fit the cover into what's left, keeping its shape.
  const aspect = art ? (art.naturalWidth ?? art.width) / (art.naturalHeight ?? art.height) : 2 / 3;
  let coverH = Math.min(bottom - top - gaps.cover - textH, story ? 960 : 720);
  let coverW = coverH * aspect;
  if (coverW > innerW) {
    coverW = innerW;
    coverH = coverW / aspect;
  }
  coverH = Math.max(coverH, 0);
  // Any spare height is split above and below, so short cards stay centred.
  const spare = Math.max(0, bottom - top - gaps.cover - textH - coverH);
  const coverBox = { x: (W - coverW) / 2, y: top + spare * 0.4, w: coverW, h: coverH };
  const frame = { pad, cover: coverBox, contentTop: coverBox.y + coverH + gaps.cover, hue };

  theme.background?.(ctx, W, H, art, frame);
  drawCover(ctx, theme, art && theme.cover ? theme.cover(art) : art, coverBox);

  let y = frame.contentTop;
  const textX = align === "center" ? W / 2 : pad;

  if (content.badges.length) {
    drawBadges(ctx, theme, content.badges, pad, y, badgeH, innerW, align);
    y += badgeH + gaps.badges;
  }

  ctx.save();
  ctx.font = theme.titleFont(title.size);
  setSpacing(ctx, theme.titleSpacing ?? -0.5);
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  if (theme.titleGlow) {
    ctx.shadowColor = theme.titleGlow;
    ctx.shadowBlur = 26;
  }
  title.lines.forEach((line, i) => {
    const baseline = y + titleLineH * (i + 1) - titleLineH * 0.2;
    const text = theme.titlePrefix && i === 0 ? `${theme.titlePrefix}${line}` : line;
    const indent = theme.titlePrefix && i > 0 ? ctx.measureText(theme.titlePrefix).width : 0;
    if (theme.titleGradient) {
      const g = ctx.createLinearGradient(0, baseline - title.size, 0, baseline);
      theme.titleGradient.forEach((color, stop) => g.addColorStop(stop / (theme.titleGradient.length - 1), color));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = theme.text;
    }
    ctx.fillText(text, textX + indent, baseline);
  });
  ctx.restore();
  setSpacing(ctx, 0);
  y += title.lines.length * titleLineH;

  if (statsH) {
    y += gaps.title;
    drawStats(ctx, theme, content.stats, pad, y, innerW, story, align);
    y += statsH;
  }

  if (noteLines.length) {
    y += gaps.stats;
    const indent = theme.noteQuote ? 70 : 0;
    if (theme.noteQuote) {
      ctx.fillStyle = theme.accent;
      ctx.font = `600 ${noteSize * 3.4}px ${SERIF}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("“", pad - 6, y + noteSize * 2.3);
    }
    ctx.font = theme.noteFont(noteSize);
    ctx.fillStyle = theme.text;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    noteLines.forEach((line, i) => ctx.fillText(line, textX + indent, y + noteLineH * (i + 1) - noteLineH * 0.25));
    y += noteLines.length * noteLineH;
  }

  if (content.byline) {
    y += gaps.note;
    ctx.font = theme.labelFont(bylineSize);
    ctx.fillStyle = theme.muted;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`— ${content.byline}`, textX + (theme.noteQuote && noteLines.length ? 70 : 0), y + bylineSize * 1.1);
  }

  drawFooter(ctx, theme, content.site, pad, footerY, innerW, align);
  theme.overlay?.(ctx, W, H, frame);
  return canvas;
}

/** Loads the first of `urls` that works, as a CORS-clean image (so the canvas can be exported). */
export function loadFirstImage(urls) {
  return urls.filter(Boolean).reduce(
    (previous, url) => previous.then((found) => found ?? new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img.naturalWidth > 1 ? img : null);
      img.onerror = () => resolve(null);
      img.src = url;
    })),
    Promise.resolve(null),
  );
}

/** Steam's tall library art first (it suits 4:5 and 9:16), then the wide store header. */
export function coverUrls(appId, headerImageUrl) {
  const base = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}`;
  return [`${base}/library_600x900_2x.jpg`, `${base}/library_600x900.jpg`, headerImageUrl, `${base}/header.jpg`];
}

/** Waits for the faces a theme draws with, so the first render isn't in a fallback font. */
export async function loadThemeFonts(themeId) {
  if (typeof document === "undefined" || !document.fonts) return;
  const theme = SHARE_THEMES.find((t) => t.id === themeId) ?? SHARE_THEMES[0];
  const faces = [theme.titleFont(40), theme.labelFont(20), theme.valueFont(40), theme.noteFont(20), `400 40px ${GROTESK}`, `500 20px ${SANS}`];
  // A face that never arrives (offline, blocked) just falls back; don't hold the preview hostage.
  await Promise.race([
    Promise.all(faces.map((font) => document.fonts.load(font).catch(() => null))),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
}
