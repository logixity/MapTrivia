// Flag similarity scoring. Pixels are snapped to a small named palette (so "close enough" colours match),
// then the drawing is compared by position (with a little tolerance) and by overall colour makeup.

const PALETTE: [number, number, number][] = [
  [255, 255, 255], // 0 white
  [20, 20, 20], // 1 black
  [206, 17, 38], // 2 red
  [140, 20, 40], // 3 dark red
  [255, 140, 26], // 4 orange
  [252, 209, 22], // 5 yellow
  [0, 140, 69], // 6 green
  [0, 90, 50], // 7 dark green
  [0, 48, 135], // 8 blue
  [100, 170, 230], // 9 light blue
  [120, 60, 150], // 10 purple
  [130, 80, 40], // 11 brown
  [150, 150, 150], // 12 gray
];
export const WHITE = 0;

// Partly-right colours earn partial credit.
const NEAR: [number, number, number][] = [[2, 3, 0.7], [2, 4, 0.5], [4, 5, 0.5], [6, 7, 0.7], [8, 9, 0.6], [1, 12, 0.5], [0, 12, 0.4], [3, 11, 0.5], [8, 10, 0.3], [0, 9, 0.2], [0, 5, 0.15]];
const SIMILARITY: number[][] = PALETTE.map((_, a) => PALETTE.map((__, b) => (a === b ? 1 : 0)));
for (const [a, b, v] of NEAR) SIMILARITY[a][b] = SIMILARITY[b][a] = v;

function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const PALETTE_LAB = PALETTE.map(toLab);

export function classify(data: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(data.length / 4);
  const cache = new Map<number, number>();
  for (let i = 0; i < out.length; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let cls = cache.get(key);
    if (cls === undefined) {
      const lab = toLab([r, g, b]);
      let best = Infinity;
      cls = 0;
      PALETTE_LAB.forEach((p, index) => {
        const d = (lab[0] - p[0]) ** 2 + (lab[1] - p[1]) ** 2 + (lab[2] - p[2]) ** 2;
        if (d < best) {
          best = d;
          cls = index;
        }
      });
      cache.set(key, cls);
    }
    out[i] = cls;
  }
  return out;
}

// Returns 0..1. Position match is 60% (forgiving about 2px shifts), colour makeup is 40%,
// so swapping the stripe order of a flag still earns a solid partial score.
export function scoreFlag(expected: Uint8Array, actual: Uint8Array, w: number, h: number): number {
  const radius = 2;
  let spatial = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const want = expected[y * w + x];
      let best = 0;
      for (let dy = -radius; dy <= radius && best < 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const s = SIMILARITY[want][actual[yy * w + xx]];
          // Looking further away is worth slightly less.
          const value = s * (dx === 0 && dy === 0 ? 1 : 0.85);
          if (value > best) best = value;
        }
      }
      spatial += best;
    }
  }
  spatial /= w * h;

  const count = (data: Uint8Array) => {
    const bins = new Array(PALETTE.length).fill(0);
    for (const c of data) bins[c]++;
    return bins.map((n) => n / data.length);
  };
  const a = count(expected);
  const b = count(actual);
  let composition = 0;
  for (let i = 0; i < a.length; i++) {
    composition += Math.min(a[i], b[i]);
    // Credit near colours for the leftover share (e.g. navy drawn where blue was expected).
    for (let j = 0; j < a.length; j++) if (i !== j && SIMILARITY[i][j] > 0) composition += Math.max(0, Math.min(a[i] - b[i], b[j] - a[j])) * SIMILARITY[i][j] * 0.5;
  }
  return Math.min(1, 0.6 * spatial + 0.4 * Math.min(1, composition));
}
