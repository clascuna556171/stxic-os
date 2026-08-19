// Generates Stxic brand assets (PWA icons, favicon, Android launcher icons)
// from the single "Orbit S" SVG mark. Mirrors components/brand/brand-mark.tsx.
//
// Run:  node scripts/generate-icons.mjs
import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SURFACE = "#131313";
const ACCENT = "#00D4FF";
const BORDER = "rgba(255,255,255,0.10)";
const BG = "#0A0A0A";

/**
 * The mark itself (drawn at size `s`, centered in a `s`×`s` viewBox).
 * @param {number} s   canvas size
 * @param {{ center?: number, tile?: boolean }} opts center = fraction of
 *   canvas to scale the mark to (for maskable safe zones); tile = draw the
 *   rounded squircle tile behind the mark (with a full-bleed dark backdrop so
 *   the corners read as part of the icon on any background).
 */
function mark(s, { center = 1, tile = true } = {}) {
  const c = s / 2;
  const scale = center;
  const ringR = 31 * scale * (s / 100);
  const ringW = Math.max(1.5, 4 * scale * (s / 100));
  const sW = Math.max(2.5, 9 * scale * (s / 100));
  const dotR = Math.max(2, 7 * scale * (s / 100));
  const pathD =
    "M 42 33 C 55 29, 62 35, 57 44 C 53 51, 44 48, 45 55 C 46 63, 51 69, 59 68";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${
    tile
      ? `<rect width="${s}" height="${s}" fill="${BG}"/><rect width="${s}" height="${s}" rx="${Math.round(24 * (s / 100))}" fill="${SURFACE}" stroke="${BORDER}"/>`
      : ""
  }
  <circle cx="${c}" cy="${c}" r="${ringR}" fill="none" stroke="${ACCENT}" stroke-opacity="0.35" stroke-width="${ringW}"/>
  <path d="${pathD}" transform="translate(${(s - 100 * scale) / 2} ${(s - 100 * scale) / 2}) scale(${scale})" fill="none" stroke="${ACCENT}" stroke-width="${sW}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${c}" cy="${c}" r="${dotR}" fill="${ACCENT}"/>
</svg>`;
}

async function renderPng(svg, file) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(file, buf);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${svg.match(/width="(\d+)"/)?.[1]}px)`);
}

async function renderPwa() {
  // Standard PWA icons (tile fills the whole canvas).
  await renderPng(mark(192, { center: 1, tile: true }), "public/icon-192.png");
  await renderPng(mark(512, { center: 1, tile: true }), "public/icon-512.png");
  // Maskable: mark kept inside the ~80% safe zone.
  await renderPng(mark(512, { center: 0.8, tile: true }), "public/icon-maskable-512.png");
  // Favicon (app/icon.png) — full-tile mark.
  await renderPng(mark(256, { center: 1, tile: true }), "app/icon.png");
}

async function renderAndroid() {
  // Legacy launcher icons (mipmap-*). mdpi=48 → xxxhdpi=192.
  const sizes = [
    ["mdpi", 48],
    ["hdpi", 72],
    ["xhdpi", 96],
    ["xxhdpi", 144],
    ["xxxhdpi", 192],
  ];
  for (const [density, s] of sizes) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await mkdir(dir, { recursive: true });
    await renderPng(mark(s, { center: 1, tile: true }), `${dir}/ic_launcher.png`);
    await renderPng(mark(s, { center: 1, tile: true }), `${dir}/ic_launcher_round.png`);
  }

  // Adaptive icon foreground: transparent background, mark within the safe
  // circle (~66% of the canvas). mdpi=108 → xxxhdpi=432.
  const fgSizes = [
    ["mdpi", 108],
    ["hdpi", 162],
    ["xhdpi", 216],
    ["xxhdpi", 324],
    ["xxxhdpi", 432],
  ];
  for (const [density, s] of fgSizes) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await renderPng(mark(s, { center: 0.6, tile: false }), `${dir}/ic_launcher_foreground.png`);
  }

  // Background color for adaptive icons (matches brand dark tile).
  await writeFile(
    "android/app/src/main/res/values/ic_launcher_background.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0A0A0A</color>
</resources>
`,
  );
  console.log("wrote android/app/src/main/res/values/ic_launcher_background.xml");
}

await renderPwa();
await renderAndroid();
