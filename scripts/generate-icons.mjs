// Generates PWA icons (192, 512, maskable-512) from a simple SVG mark.
// Run: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const bg = "#0a0a0a";
const accent = "#00d4ff";

function mark(size, { maskable }) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const ring = maskable ? size * 0.22 : size * 0.3;
  const dot = maskable ? size * 0.09 : size * 0.12;
  const stroke = Math.max(2, Math.round(size * 0.05));
  const c = size / 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <circle cx="${c}" cy="${c}" r="${ring}" fill="none" stroke="${accent}" stroke-width="${stroke}"/>
  <circle cx="${c}" cy="${c}" r="${dot}" fill="${accent}"/>
</svg>`;
}

async function render(size, name, opts) {
  const buf = await sharp(Buffer.from(mark(size, opts)))
    .png()
    .toBuffer();
  await writeFile(`public/${name}`, buf);
  console.log(`wrote public/${name} (${size}x${size})`);
}

await render(192, "icon-192.png", { maskable: false });
await render(512, "icon-512.png", { maskable: false });
await render(512, "icon-maskable-512.png", { maskable: true });
