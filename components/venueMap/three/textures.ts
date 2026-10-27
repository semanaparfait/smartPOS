// Procedural floor textures (no image files; works on web and native GL).
import * as THREE from "three";
import type { Material } from "../types";

const SIZE = 256;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function make(paint: (x: number, y: number, r: () => number) => [number, number, number], seed = 7) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const r = rng(seed);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const [cr, cg, cb] = paint(x, y, r);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.max(0, Math.min(255, cr));
      data[i + 1] = Math.max(0, Math.min(255, cg));
      data[i + 2] = Math.max(0, Math.min(255, cb));
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Wood planks: rows with per-plank tone, grain streaks and dark seams.
function planks(base: string, seamDark: number, rows: number, seed: number) {
  const [br, bg, bb] = hex(base);
  const rowH = SIZE / rows;
  const tone: number[] = [];
  const offsets: number[] = [];
  const r0 = rng(seed);
  for (let i = 0; i < rows * 4; i++) tone.push(0.86 + r0() * 0.22);
  for (let i = 0; i < rows; i++) offsets.push(Math.floor(r0() * SIZE));
  return make((x, y, r) => {
    const row = Math.floor(y / rowH);
    const px = (x + offsets[row]) % SIZE;
    const plank = Math.floor(px / (SIZE / 2));
    const t = tone[row * 4 + plank];
    const grain = Math.sin((px * 0.05 + y * 0.9 + Math.sin(px * 0.02) * 6) * 1.3) * 0.04 + (r() - 0.5) * 0.05;
    const seam = y % rowH < 1.2 || px % (SIZE / 2) < 1.2 ? seamDark : 1;
    const f = t * (1 + grain) * seam;
    return [br * f, bg * f, bb * f];
  }, seed);
}

function tiles(base: string, grout: string, n: number, jitter: number, seed: number) {
  const [br, bg, bb] = hex(base);
  const [gr, gg, gb] = hex(grout);
  const cell = SIZE / n;
  const tone: number[] = [];
  const r0 = rng(seed);
  for (let i = 0; i < n * n; i++) tone.push(1 + (r0() - 0.5) * jitter);
  return make((x, y, r) => {
    if (x % cell < 1.5 || y % cell < 1.5) return [gr, gg, gb];
    const t = tone[Math.floor(y / cell) * n + Math.floor(x / cell)] * (1 + (r() - 0.5) * 0.03);
    return [br * t, bg * t, bb * t];
  }, seed);
}

function noise(base: string, amount: number, seed: number, speck = 0) {
  const [br, bg, bb] = hex(base);
  return make((x, y, r) => {
    let f = 1 + (r() - 0.5) * amount;
    if (speck && r() < speck) f *= 0.85;
    return [br * f, bg * f, bb * f];
  }, seed);
}

function marble() {
  const [br, bg, bb] = hex("#F2EFE8");
  return make((x, y, r) => {
    const v = Math.sin(x * 0.03 + Math.sin(y * 0.02) * 4 + Math.sin((x + y) * 0.011) * 3);
    const vein = Math.abs(v) < 0.04 ? 0.82 : 1;
    const tileEdge = x % 128 < 1.2 || y % 128 < 1.2 ? 0.9 : 1;
    const f = (1 + (r() - 0.5) * 0.03) * vein * tileEdge;
    return [br * f, bg * f, bb * f];
  }, 11);
}

function grass() {
  return make((x, y, r) => {
    const stripe = Math.floor(y / 32) % 2 ? 0.95 : 1.03;
    const f = stripe * (1 + (r() - 0.5) * 0.25);
    return [118 * f, 158 * f, 82 * f];
  }, 5);
}

function water() {
  return make((x, y) => {
    const w = Math.sin(x * 0.08 + Math.sin(y * 0.05) * 2) * 0.06 + Math.sin(y * 0.11) * 0.04;
    const f = 1 + w;
    return [90 * f, 175 * f, 215 * f];
  }, 3);
}

const cache = new Map<string, THREE.DataTexture>();

// Texture for a floor material and how many metres one texture tile covers.
export function floorTexture(material: Material): { tex: THREE.DataTexture; metres: number } {
  const metres: Record<Material, number> = {
    wood: 2.4,
    deck: 2.4,
    tile: 2.4,
    marble: 2.4,
    carpet: 2,
    concrete: 3,
    grass: 4,
    water: 3,
  };
  let tex = cache.get(material);
  if (!tex) {
    tex =
      material === "wood"
        ? planks("#C8A27A", 0.78, 12, 21)
        : material === "deck"
          ? planks("#A9825A", 0.6, 8, 9)
          : material === "tile"
            ? tiles("#E9EAEC", "#C9CDD2", 4, 0.06, 4)
            : material === "marble"
              ? marble()
              : material === "carpet"
                ? noise("#8E95A8", 0.18, 2)
                : material === "concrete"
                  ? noise("#B9B8B1", 0.12, 8, 0.02)
                  : material === "grass"
                    ? grass()
                    : water();
    cache.set(material, tex);
  }
  return { tex, metres: metres[material] };
}
