// Genera le icone PNG dell'app in public/icons/ (180 per iOS, 192 e 512 per il manifest).
// Disegno definitivo: un compasso da disegno tecnico che traccia un cerchio arancione, su una tavola
// blu da cianografia quadrettata.
// Uso: npm run icone
//
// Le icone sono PNG opachi (senza trasparenza): iOS riempie di nero le parti trasparenti.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");

// Colori dell'aspetto definitivo (src/app/styles.css): tavola blu da cianografia, linee avorio,
// accento arancione. Sono i colori del tema scuro e chiaro mescolati: l'icona deve riconoscersi
// su qualunque sfondo della schermata Home.
const TAVOLA = [23, 63, 112]; // blu cianografia scuro
const TAVOLA_BASSO = [28, 77, 135]; // --blu del tema chiaro, verso il basso
const AVORIO = [251, 248, 239]; // --carta-alta
const ARANCIO = [255, 168, 98]; // --arancio del tema scuro: si legge bene sul blu

/** Distanza di un punto da un segmento. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Geometria in coordinate normalizzate (0..1), tutta dentro il cerchio centrale di raggio 0,4
// (così l'icona resta intera anche dove il sistema la ritaglia a cerchio). Il compasso ha il
// perno A in alto: una gamba finisce con la punta nel centro C del cerchio, l'altra con la mina
// sul punto P del cerchio che sta tracciando.
const A = [0.5, 0.17];
const C = [0.5, 0.6];
const R = 0.26;
const ANGLE = (22 * Math.PI) / 180;
const P = [C[0] + R * Math.cos(ANGLE), C[1] + R * Math.sin(ANGLE)];

/** Colore del punto (x, y) in coordinate normalizzate: strati dal più alto al più basso. */
function colorAt(x, y) {
  // Perno: anello avorio con il centro arancione.
  const dA = Math.hypot(x - A[0], y - A[1]);
  if (dA < 0.024) return ARANCIO;
  if (dA < 0.058) return AVORIO;
  // Impugnatura sopra il perno.
  if (Math.abs(x - A[0]) < 0.02 && y > 0.075 && y < A[1]) return AVORIO;
  // Mina che traccia, sopra la sua gamba.
  if (Math.hypot(x - P[0], y - P[1]) < 0.036) return ARANCIO;
  // Gambe; la punta nel centro.
  if (distToSegment(x, y, A[0], A[1], C[0], C[1]) < 0.022) return AVORIO;
  if (distToSegment(x, y, A[0], A[1], P[0], P[1]) < 0.022) return AVORIO;
  if (Math.hypot(x - C[0], y - C[1]) < 0.028) return AVORIO;
  // Il cerchio tracciato, in arancione.
  if (Math.abs(Math.hypot(x - C[0], y - C[1]) - R) < 0.017) return ARANCIO;
  // Fondo: la tavola con la quadrettatura di costruzione (linea più marcata ogni quattro).
  const base = mix(TAVOLA, TAVOLA_BASSO, y);
  const cell = 1 / 16;
  const near = (v, step) => Math.abs(v / step - Math.round(v / step)) * step;
  if (near(x, cell * 4) < 0.004 || near(y, cell * 4) < 0.004) return mix(base, AVORIO, 0.22);
  if (near(x, cell) < 0.0025 || near(y, cell) < 0.0025) return mix(base, AVORIO, 0.1);
  return base;
}

/** Rasterizza con 4x4 campioni per pixel (bordi lisci). */
function render(size) {
  const samples = 5;
  const rgb = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colorAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = samples * samples;
      const i = (py * size + px) * 3;
      rgb[i] = Math.round(r / n);
      rgb[i + 1] = Math.round(g / n);
      rgb[i + 2] = Math.round(b / n);
    }
  }
  return rgb;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Codifica un'immagine RGB a 8 bit in formato PNG. */
function encodePng(size, rgb) {
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filtro "nessuno"
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profondità
  header[9] = 2; // tipo colore: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  await writeFile(file, encodePng(size, render(size)));
  console.log(`scritta ${path.relative(root, file)}`);
}
