// Genera le icone PNG dell'app in public/icons/ (180 per iOS, 192 e 512 per il manifest).
// Disegno provvisorio: un compasso da disegno tecnico che traccia un cerchio, su carta avorio.
// Uso: npm run icone
//
// Le icone sono PNG opachi (senza trasparenza): iOS riempie di nero le parti trasparenti.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");

const CARTA = [246, 241, 228];
const BLU = [31, 79, 143];
const ARANCIO = [199, 91, 18];

/** Distanza di un punto da un segmento. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Geometria in coordinate normalizzate (0..1). Le gambe del compasso partono dal perno A:
// una arriva al centro C del cerchio (la punta), l'altra su un punto P del cerchio (la mina).
const A = [0.5, 0.12];
const C = [0.5, 0.62];
const R = 0.26;
const P = [C[0] + R * Math.cos((-15 * Math.PI) / 180), C[1] + R * Math.sin((-15 * Math.PI) / 180)];

/** Colore del punto (x, y) in coordinate normalizzate. */
function colorAt(x, y) {
  if (Math.hypot(x - A[0], y - A[1]) < 0.055) return ARANCIO; // perno
  if (Math.hypot(x - C[0], y - C[1]) < 0.025) return ARANCIO; // punta al centro
  if (distToSegment(x, y, A[0], A[1], C[0], C[1]) < 0.022) return BLU; // gamba con la punta
  if (distToSegment(x, y, A[0], A[1], P[0], P[1]) < 0.022) return BLU; // gamba con la mina
  if (Math.abs(Math.hypot(x - C[0], y - C[1]) - R) < 0.018) return BLU; // cerchio
  return CARTA;
}

/** Rasterizza con 4x4 campioni per pixel (bordi lisci). */
function render(size) {
  const samples = 4;
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
