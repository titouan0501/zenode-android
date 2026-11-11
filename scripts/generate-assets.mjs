// Genere les icones et le splash a partir du logo Zenode (charte 3.4).
// Usage : npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
await mkdir(out, { recursive: true });

const Z_PILL = '12,9.5 36,9.5 36,15 17.5,24 36,24 36,29.5 12,29.5 12,24 30.5,15 12,15';
const PILL = '<rect x="12" y="34" width="15" height="4" rx="2" fill="#3fdc94"/>';

// Z centre dans un canevas 1024 (zone de securite adaptive ~66 %).
function centered(zFill, pill) {
  const s = 17;
  // Boite englobante du logo : x 12..36, y 9.5..38 -> centre (24, 23.75)
  const tx = 512 - 24 * s;
  const ty = 512 - 23.75 * s;
  return `<g transform="translate(${tx} ${ty}) scale(${s})">
    <polygon points="${Z_PILL}" fill="${zFill}"/>${pill ? PILL : ''}</g>`;
}

const svg = (body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}${body}</svg>`;

async function png(name, markup) {
  await sharp(Buffer.from(markup)).png().toFile(join(out, name));
  console.log('ok', name);
}

await png('android-icon-background.png', svg('', '#052117'));
await png('android-icon-foreground.png', svg(centered('#d1fae4', true), null));
await png('android-icon-monochrome.png', svg(centered('#ffffff', false), null));
await png('icon.png', svg(centered('#d1fae4', true), '#052117'));

// Splash : tuile de marque seule, fond gere par le plugin (#09090b).
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="11" fill="#0f5e3f"/>
  <polygon points="${Z_PILL}" fill="#d1fae4"/>${PILL}</svg>`;
await sharp(Buffer.from(tile)).png().toFile(join(out, 'splash-icon.png'));
console.log('ok splash-icon.png');
