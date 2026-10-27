// Isometric ("dollhouse") 3D rendering of a floor, in SVG.
// Floors/flat things are the 2D plan drawn through an affine iso transform;
// walls and furniture are extruded prisms sorted back-to-front.
import React from "react";
import Svg, { Defs, G, Line, Pattern, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { C, CATALOG, drawItem, MATERIALS, showsLabel } from "./catalog";
import { PX_PER_M, type Floor, type Item, type Material, type Point } from "./types";

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const WALL_H = 40; // ~1 m cut-away walls so rooms stay visible
const M = (m: number) => m * PX_PER_M;

export type IsoView = 0 | 1 | 2 | 3; // quarter turns

type Prism = { pts: Point[]; z0: number; z1: number; color: string; topColor?: string; opacity?: number; key: string };

/* ---------- geometry ---------- */

const rotPts = (pts: Point[], cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map((p) => ({ x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
};
const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const circle = (cx: number, cy: number, r: number, n = 14): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * r, y: cy + Math.sin((i / n) * Math.PI * 2) * r }));

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

// Map a world point into the rotated view, then iso screen space.
export function makeProjector(floor: Floor, view: IsoView) {
  const W = floor.w;
  const H = floor.h;
  const toView = (p: Point): Point => {
    switch (view) {
      case 1:
        return { x: H - p.y, y: p.x };
      case 2:
        return { x: W - p.x, y: H - p.y };
      case 3:
        return { x: p.y, y: W - p.x };
      default:
        return p;
    }
  };
  const vw = view % 2 ? H : W;
  const vh = view % 2 ? W : H;
  const offX = vh * COS + 20;
  const offY = WALL_H + 70;
  const project = (p: Point, z = 0) => {
    const v = toView(p);
    return { x: (v.x - v.y) * COS + offX, y: (v.x + v.y) * SIN - z + offY };
  };
  const size = { w: (vw + vh) * COS + 40, h: (vw + vh) * SIN + WALL_H + 110 };
  // Screen (unscaled) back to the floor plane, e.g. where someone tapped.
  const unproject = (sx: number, sy: number): Point => {
    const a = (sx - offX) / COS;
    const b = (sy - offY) / SIN;
    const vx = (a + b) / 2;
    const vy = (b - a) / 2;
    switch (view) {
      case 1:
        return { x: vy, y: H - vx };
      case 2:
        return { x: W - vx, y: H - vy };
      case 3:
        return { x: W - vy, y: vx };
      default:
        return { x: vx, y: vy };
    }
  };
  // SVG matrix taking world (x,y) to screen at z=0.
  const o = project({ x: 0, y: 0 });
  const ex = project({ x: 1, y: 0 });
  const ey = project({ x: 0, y: 1 });
  const matrix = `matrix(${ex.x - o.x} ${ex.y - o.y} ${ey.x - o.x} ${ey.y - o.y} ${o.x} ${o.y})`;
  return { project, unproject, toView, size, matrix };
}

/* ---------- 3D models (local item coords, before rotation) ---------- */

function chair(cx: number, cy: number, angleDeg: number): Prism[] {
  const seat = rotPts(rect(cx - 8, cy - 7, 16, 14), cx, cy, angleDeg);
  const back = rotPts(rect(cx - 8, cy + 4, 16, 3), cx, cy, angleDeg);
  return [
    { pts: seat, z0: 0, z1: 17, color: C.chair, key: "s" },
    { pts: back, z0: 17, z1: 34, color: "#D9DBD2", key: "b" },
  ];
}

function chairsRound(w: number, h: number, seats: number): Prism[] {
  const r = Math.min(w, h) / 2 - 13;
  return Array.from({ length: seats }).flatMap((_, i) => {
    const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
    return chair(w / 2 + Math.cos(a) * (r + 6), h / 2 + Math.sin(a) * (r + 6), (a * 180) / Math.PI + 90 + 180);
  });
}

function model(item: Item): Prism[] {
  const { w, h } = item;
  const seats = item.seats ?? CATALOG[item.type].seats ?? 0;
  const p = (pts: Point[], z0: number, z1: number, color: string, key = ""): Prism => ({ pts, z0, z1, color, key });
  const top = (pts: Point[], z: number, color: string) => p(pts, z - 2, z, color, "top");

  switch (item.type) {
    case "table-round": {
      const r = Math.min(w, h) / 2 - 13;
      return [...chairsRound(w, h, seats), p(circle(w / 2, h / 2, 4), 0, 28, C.inkSoft), top(circle(w / 2, h / 2, r, 18), 30, C.white)];
    }
    case "table-square":
    case "table-rect": {
      const inset = 13;
      const out: Prism[] = [];
      if (item.type === "table-square") {
        const spots = [
          [w / 2, inset - 4, 0],
          [w / 2, h - inset + 4, 180],
          [inset - 4, h / 2, -90],
          [w - inset + 4, h / 2, 90],
        ].slice(0, Math.min(4, seats));
        spots.forEach(([x, y, a]) => out.push(...chair(x, y, a)));
        out.push(p(rect(w / 2 - 4, h / 2 - 4, 8, 8), 0, 28, C.inkSoft), top(rect(inset, inset, w - inset * 2, h - inset * 2), 30, C.white));
      } else {
        const perSide = Math.ceil(seats / 2);
        const bottom = seats - perSide;
        for (let i = 0; i < perSide; i++) out.push(...chair((w / (perSide + 1)) * (i + 1), inset - 4, 0));
        for (let i = 0; i < bottom; i++) out.push(...chair((w / (bottom + 1)) * (i + 1), h - inset + 4, 180));
        out.push(
          p(rect(8, h / 2 - 3, 6, 6), 0, 28, C.inkSoft),
          p(rect(w - 14, h / 2 - 3, 6, 6), 0, 28, C.inkSoft),
          top(rect(2, inset, w - 4, h - inset * 2), 30, C.white),
        );
      }
      return out;
    }
    case "high-table":
      return [
        p(circle(w / 2, 5, 7, 10), 0, 30, C.chair),
        p(circle(w / 2, h - 5, 7, 10), 0, 30, C.chair),
        p(circle(w / 2, h / 2, 3), 0, 42, C.inkSoft),
        top(circle(w / 2, h / 2, Math.min(w, h) / 2 - 10), 44, C.white),
      ];
    case "booth":
      return [
        p(rect(2, 2, w - 4, 6), 0, 40, C.inkSoft),
        p(rect(2, 2, 6, h - 4), 0, 40, C.inkSoft),
        p(rect(w - 8, 2, 6, h - 4), 0, 40, C.inkSoft),
        p(rect(8, 8, w - 16, 10), 0, 18, "#56617E"),
        p(rect(8, 18, 10, h - 20), 0, 18, "#56617E"),
        p(rect(w - 18, 18, 10, h - 20), 0, 18, "#56617E"),
        p(rect(w / 2 - 3, h / 2 + 4, 6, 6), 0, 28, C.inkSoft),
        top(rect(24, 24, w - 48, h - 34), 30, C.white),
      ];
    case "sofa":
    case "armchair": {
      const arm = item.type === "sofa" ? 8 : 6;
      return [
        p(rect(1, 1, w - 2, h * 0.3), 0, 36, C.inkSoft),
        p(rect(1, h * 0.3, arm, h * 0.7 - 1), 0, 26, C.inkSoft),
        p(rect(w - arm - 1, h * 0.3, arm, h * 0.7 - 1), 0, 26, C.inkSoft),
        p(rect(arm + 1, h * 0.3, w - arm * 2 - 2, h * 0.7 - 1), 0, 18, "#56617E"),
      ];
    }
    case "bar-stool":
      return [p(circle(w / 2, h / 2, Math.min(w, h) / 2 - 1, 10), 0, 30, C.chair)];

    case "bar-counter": {
      const counterH = h * 0.5;
      const stools = Math.max(2, Math.floor(w / 34));
      return [
        p(rect(1, 1, w - 2, counterH * 0.35), 0, 70, C.steel),
        p(rect(1, counterH * 0.35 + 6, w - 2, counterH * 0.65), 0, 44, C.inkSoft),
        ...Array.from({ length: stools }).map((_, i) =>
          p(circle((w / stools) * (i + 0.5), counterH + 6 + (h - counterH - 8) / 2, 7.5, 10), 0, 30, C.chair, `st${i}`),
        ),
      ];
    }
    case "cashier":
      return [
        p(rect(1, 1, w - 2, h * 0.55), 0, 40, C.white),
        p(rect(w / 2 - 12, 6, 24, 6), 40, 54, C.ink),
        p(circle(w / 2, h - 9, 7, 10), 0, 26, C.chair),
      ];
    case "checkout":
      return [
        p(rect(1, 1, w - 2, h * 0.55), 0, 34, C.steel),
        p(rect(w * 0.65, 5, 22, h * 0.55 - 10), 34, 46, C.ink),
        p(circle(w * 0.72, h - 9, 7, 10), 0, 26, C.chair),
      ];
    case "reception":
      return [
        p(rect(2, h * 0.08, w - 4, h * 0.42), 0, 44, C.white),
        p(circle(w * 0.35, h - 10, 7, 10), 0, 26, C.chair),
        p(circle(w * 0.65, h - 10, 7, 10), 0, 26, C.chair),
      ];
    case "kitchen-line": {
      const burners = Math.max(2, Math.floor((w * 0.6) / 30));
      return [
        p(rect(1, 1, w - 2, h - 2), 0, 36, C.steel),
        ...Array.from({ length: burners }).map((_, i) => p(circle(18 + i * 30, h / 2, 9, 10), 36, 38, C.ink, `b${i}`)),
      ];
    }
    case "fridge":
      return [p(rect(1, 1, w - 2, h - 2), 0, 76, C.steel)];
    case "dj-booth":
      return [
        p(rect(1, 1, w - 2, h - 2), 0, 40, C.ink),
        p(circle(w * 0.28, h / 2, Math.min(w, h) * 0.22, 12), 40, 43, C.lime, "d1"),
        p(circle(w * 0.72, h / 2, Math.min(w, h) * 0.22, 12), 40, 43, C.lime, "d2"),
      ];
    case "stage":
      return [p(rect(1, 1, w - 2, h - 2), 0, 22, "#8C6B4A")];
    case "shelf":
      return [p(rect(1, 1, w - 2, h - 2), 0, 72, "#DDE1E6")];
    case "gondola":
      return [p(rect(1, 1, w - 2, h - 2), 0, 64, "#DDE1E6")];
    case "fridge-row":
      return [p(rect(1, 1, w - 2, h * 0.45), 0, 80, C.steel), p(rect(1, h * 0.45, w - 2, h * 0.5), 0, 80, C.glass, "glass")];
    case "display-table":
      return [
        p(rect(1, 1, w - 2, h - 2), 0, 30, C.white),
        ...[0.25, 0.5, 0.75].flatMap((fx) => [0.3, 0.7].map((fy) => p(rect(w * fx - 6, h * fy - 6, 12, 12), 30, 40, "#E9C46A", `${fx}${fy}`))),
      ];
    case "bed-single":
    case "bed-double": {
      const double = item.type === "bed-double";
      return [
        p(rect(1, 1, w - 2, h - 2), 0, 16, C.white),
        p(rect(1, 1, w - 2, 4), 0, 36, C.inkSoft, "head"),
        p(rect(2, h * 0.38, w - 4, h * 0.62 - 3), 16, 22, "#C9CFDF", "blanket"),
        ...(double
          ? [p(rect(5, 7, w / 2 - 8, 12), 16, 24, C.ivory, "p1"), p(rect(w / 2 + 3, 7, w / 2 - 8, 12), 16, 24, C.ivory, "p2")]
          : [p(rect(5, 7, w - 10, 12), 16, 24, C.ivory, "p1")]),
      ];
    }
    case "desk":
      return [p(rect(1, 1, w - 2, h * 0.6), 28, 30, C.white), p(rect(3, 3, 4, 4), 0, 28, C.inkSoft), p(rect(w - 7, 3, 4, 4), 0, 28, C.inkSoft), ...chair(w / 2, h - 8, 180)];
    case "pool":
      return [];
    case "sunbed":
      return [p(rect(1, 1, w - 2, h - 2), 0, 12, C.white), p(rect(1, 1, w - 2, h * 0.3), 12, 22, C.white, "back")];
    case "restroom":
      return [p(rect(w / 2 - 3, h / 2 - 3, 6, 6), 0, 40, C.ink), p(rect(2, h / 2 - 2, w - 4, 4), 40, 76, C.ink, "sign")];
    case "wc":
      return [p(rect(3, 1, w - 6, h * 0.3), 0, 30, C.white), p(circle(w / 2, h * 0.62, Math.min(w / 2 - 3, h * 0.3), 12), 0, 16, C.white, "bowl")];
    case "sink":
      return [p(rect(1, 1, w - 2, h - 2), 0, 34, C.white)];
    case "stairs": {
      const steps = Math.max(4, Math.floor(h / 12));
      const stepLen = h / steps;
      // Rises away from the bottom edge towards the top.
      return Array.from({ length: steps }).map((_, i) =>
        p(rect(1, h - (i + 1) * stepLen, w - 2, stepLen), 0, (i + 1) * (WALL_H / steps), i % 2 ? "#ECEDE6" : C.white, `st${i}`),
      );
    }
    case "elevator":
      return [p(rect(1, 1, w - 2, h - 2), 0, 72, C.steel)];
    case "pillar":
      return [p(rect(0, 0, w, h), 0, WALL_H + 20, C.inkSoft)];
    case "plant":
      return [
        p(circle(w / 2, h / 2, Math.min(w, h) * 0.28, 10), 0, 10, "#9C6B4A"),
        p(circle(w / 2, h / 2, Math.min(w, h) / 2 - 1, 12), 10, 34, C.green, "leaf"),
      ];
    case "exit":
      return [p(rect(w / 2 - 2, h / 2 - 2, 4, 4), 0, 44, C.ink), p(rect(2, h / 2 - 2, w - 4, 4), 44, 64, C.exit, "sign")];
    case "info":
      return [p(rect(w / 2 - 3, h / 2 - 3, 6, 6), 0, 36, C.ink), p(circle(w / 2, h / 2, Math.min(w, h) / 2 - 2, 12), 36, 40, C.ink, "disc")];
    case "you-are-here":
      return [p(circle(w / 2, h / 2, 2.5, 8), 0, 46, C.ink), p(circle(w / 2, h / 2, 8, 12), 46, 54, C.lime, "head")];
    case "door":
      // Open leaf standing at the hinge (swing arc is drawn on the floor).
      return [p(rect(-1, 0, 3, w), 0, WALL_H - 4, "#F1EFE8", "leaf")];
    case "door-double":
      return [p(rect(-1, 0, 3, w / 2), 0, WALL_H - 4, "#F1EFE8", "l1"), p(rect(w - 2, 0, 3, w / 2), 0, WALL_H - 4, "#F1EFE8", "l2")];
    default:
      return []; // entrance mat, dance floor, labels: drawn flat
  }
}

// Things that look right drawn flat on the floor.
const FLAT = new Set(["door", "door-double", "entrance", "dance-floor", "pool"]);

export const itemHeight = (item: Item) =>
  model(item).reduce((m, pr) => Math.max(m, pr.z1), FLAT.has(item.type) ? 4 : 0);

/* ---------- renderer ---------- */

type Props = {
  floor: Floor;
  scale: number;
  view: IsoView;
  focusIds?: Set<string> | null;
  idPrefix?: string;
  // Per-item tag colours (e.g. table status) and the selected item.
  tagColors?: Record<string, { bg: string; fg: string }>;
  selectedId?: string | null;
};

const PATTERNED = new Set<Material>(["tile", "marble", "wood", "deck"]);

function MaterialFill({ id, material }: { id: string; material: Material }) {
  const m = MATERIALS[material];
  if (!PATTERNED.has(material)) return null;
  const tile = material === "tile" ? 20 : material === "marble" ? 40 : 0;
  if (tile === 0) {
    return (
      <Pattern id={id} patternUnits="userSpaceOnUse" width={120} height={24}>
        <Rect width={120} height={24} fill={m.base} />
        <Line x1={0} y1={12} x2={120} y2={12} stroke={m.line} strokeWidth={1} />
        <Line x1={40} y1={0} x2={40} y2={12} stroke={m.line} strokeWidth={1} />
        <Line x1={95} y1={12} x2={95} y2={24} stroke={m.line} strokeWidth={1} />
      </Pattern>
    );
  }
  return (
    <Pattern id={id} patternUnits="userSpaceOnUse" width={tile} height={tile}>
      <Rect width={tile} height={tile} fill={m.base} />
      <Line x1={0} y1={0} x2={tile} y2={0} stroke={m.line} strokeWidth={1} />
      <Line x1={0} y1={0} x2={0} y2={tile} stroke={m.line} strokeWidth={1} />
    </Pattern>
  );
}

export default function IsoRenderer({ floor, scale, view, focusIds, idPrefix = "iso", tagColors, selectedId }: Props) {
  const { project, toView, size, matrix } = makeProjector(floor, view);
  const faded = (id: string) => (focusIds && !focusIds.has(id) ? 0.18 : 1);

  /* collect prisms */
  const prisms: (Prism & { depth: number; ownerOpacity: number })[] = [];
  const pushPrism = (pr: Prism, ownerOpacity: number) => {
    const v = pr.pts.map(toView);
    const cx = v.reduce((s, q) => s + q.x, 0) / v.length;
    const cy = v.reduce((s, q) => s + q.y, 0) / v.length;
    prisms.push({ ...pr, depth: cx + cy + pr.z0 * 0.01, ownerOpacity });
  };

  // Walls, chopped into short pieces so depth sorting stays correct around furniture.
  for (const wall of floor.walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;
    const t = wall.kind === "railing" ? 3 : wall.thickness / 2;
    const pieces = Math.max(1, Math.ceil(len / 30));
    const height = wall.kind === "railing" ? 18 : WALL_H;
    // Light wall bodies with a dark cap read like an architectural model.
    const color = wall.kind === "window" || wall.kind === "glass" ? C.glass : wall.kind === "railing" ? C.steelDark : "#E4E5DE";
    const topColor = wall.kind === "wall" ? C.ink : undefined;
    for (let i = 0; i < pieces; i++) {
      // Overlap slightly at joins so walls read as one surface.
      const a = (len / pieces) * i - (i ? 0.5 : t);
      const b = (len / pieces) * (i + 1) + (i < pieces - 1 ? 0.5 : t);
      const p0 = { x: wall.start.x + ux * a, y: wall.start.y + uy * a };
      const p1 = { x: wall.start.x + ux * b, y: wall.start.y + uy * b };
      const pts = [
        { x: p0.x - uy * t, y: p0.y + ux * t },
        { x: p1.x - uy * t, y: p1.y + ux * t },
        { x: p1.x + uy * t, y: p1.y - ux * t },
        { x: p0.x + uy * t, y: p0.y - ux * t },
      ];
      if (wall.kind === "window") {
        pushPrism({ pts, z0: 0, z1: 16, color: "#E4E5DE", topColor: C.ink, key: `${wall.id}-${i}-sill` }, focusIds ? 0.55 : 1);
        pushPrism({ pts, z0: 16, z1: height, color, opacity: 0.55, key: `${wall.id}-${i}` }, focusIds ? 0.55 : 1);
      } else {
        pushPrism({ pts, z0: 0, z1: height, color, topColor, opacity: wall.kind === "glass" ? 0.5 : 1, key: `${wall.id}-${i}` }, focusIds ? 0.55 : 1);
      }
    }
  }

  // Furniture.
  for (const item of floor.items) {
    for (const pr of model(item)) {
      const world = rotPts(
        pr.pts.map((q) => ({ x: q.x + item.x, y: q.y + item.y })),
        item.x + item.w / 2,
        item.y + item.h / 2,
        item.rotation,
      );
      pushPrism({ ...pr, pts: world, key: `${item.id}-${pr.key}-${pr.z0}` }, faded(item.id));
    }
  }

  prisms.sort((a, b) => a.depth - b.depth);

  const usedMaterials = Array.from(new Set(floor.rooms.map((r) => r.material)));

  const faces = (pr: (typeof prisms)[number]) => {
    const v = pr.pts.map(toView);
    const cx = v.reduce((s, q) => s + q.x, 0) / v.length;
    const cy = v.reduce((s, q) => s + q.y, 0) / v.length;
    const out: React.ReactElement[] = [];
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      let nx = b.y - a.y;
      let ny = -(b.x - a.x);
      // Point the normal away from the centre.
      const mx = (a.x + b.x) / 2 - cx;
      const my = (a.y + b.y) / 2 - cy;
      if (nx * mx + ny * my < 0) {
        nx = -nx;
        ny = -ny;
      }
      if (nx + ny <= 0) continue; // faces away from the viewer
      const len = Math.hypot(nx, ny) || 1;
      const light = 0.66 + 0.2 * (nx / len) + 0.02 * (ny / len);
      const A0 = project(pr.pts[i], pr.z0);
      const B0 = project(pr.pts[(i + 1) % v.length], pr.z0);
      const B1 = project(pr.pts[(i + 1) % v.length], pr.z1);
      const A1 = project(pr.pts[i], pr.z1);
      out.push(
        <Polygon
          key={`f${i}`}
          points={`${A0.x},${A0.y} ${B0.x},${B0.y} ${B1.x},${B1.y} ${A1.x},${A1.y}`}
          fill={shade(pr.color.startsWith("#") ? pr.color : "#888888", light)}
        />,
      );
    }
    const topPts = pr.pts.map((q) => project(q, pr.z1));
    out.push(
      <Polygon
        key="top"
        points={topPts.map((q) => `${q.x},${q.y}`).join(" ")}
        fill={pr.topColor ?? pr.color}
        stroke={shade(pr.topColor ?? pr.color, 0.8)}
        strokeWidth={0.5}
      />,
    );
    return out;
  };

  /* labels */
  const labelAt = (x: number, y: number, z: number) => project({ x, y }, z);

  return (
    <Svg width={size.w * scale} height={size.h * scale} viewBox={`0 0 ${size.w} ${size.h}`}>
      <Defs>
        {usedMaterials.map((m) => (
          <MaterialFill key={m} id={`${idPrefix}-${m}`} material={m} />
        ))}
      </Defs>

      {/* Base slab */}
      {(() => {
        const c = [
          { x: 0, y: 0 },
          { x: floor.w, y: 0 },
          { x: floor.w, y: floor.h },
          { x: 0, y: floor.h },
        ];
        const top = c.map((q) => project(q, 0));
        const bottom = c.map((q) => project(q, -10));
        const vis = c
          .map((q, i) => ({ i, v: toView(q) }))
          .sort((a, b) => b.v.x + b.v.y - (a.v.x + a.v.y))[0].i; // nearest corner
        const prev = (vis + 3) % 4;
        const next = (vis + 1) % 4;
        return (
          <G>
            <Polygon
              points={[top[prev], top[vis], bottom[vis], bottom[prev]].map((q) => `${q.x},${q.y}`).join(" ")}
              fill="#C9CBC1"
            />
            <Polygon
              points={[top[vis], top[next], bottom[next], bottom[vis]].map((q) => `${q.x},${q.y}`).join(" ")}
              fill="#B5B8AD"
            />
            <Polygon points={top.map((q) => `${q.x},${q.y}`).join(" ")} fill="#E3E4DC" />
          </G>
        );
      })()}

      {/* Floors and flat things, drawn as the 2D plan through the iso transform */}
      <G transform={matrix}>
        {floor.rooms.map((room) => (
          <Rect
            key={room.id}
            x={room.x}
            y={room.y}
            width={room.w}
            height={room.h}
            fill={PATTERNED.has(room.material) ? `url(#${idPrefix}-${room.material})` : MATERIALS[room.material].base}
            opacity={faded(room.id)}
          />
        ))}
        {floor.items
          .filter((i) => FLAT.has(i.type))
          .map((item) => (
            <G
              key={item.id}
              opacity={faded(item.id)}
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.w / 2} ${item.h / 2})`}
            >
              {drawItem(item)}
            </G>
          ))}
        {/* soft contact shadows under furniture */}
        {floor.items
          .filter((i) => !FLAT.has(i.type) && i.type !== "label")
          .map((item) => (
            <Rect
              key={`sh-${item.id}`}
              x={item.x + 3}
              y={item.y + 3}
              width={item.w}
              height={item.h}
              rx={6}
              fill={C.ink}
              opacity={0.06 * faded(item.id)}
              transform={`rotate(${item.rotation} ${item.x + item.w / 2} ${item.y + item.h / 2})`}
            />
          ))}
      </G>

      {/* Walls + furniture, back to front */}
      {prisms.map((pr) => (
        <G key={pr.key} opacity={(pr.opacity ?? 1) * pr.ownerOpacity}>
          {faces(pr)}
        </G>
      ))}

      {/* Room names */}
      {floor.rooms.map((room) => {
        if (!room.name) return null;
        const q = labelAt(room.x + room.w / 2, room.y + room.h / 2, 2);
        const name = room.name.toUpperCase();
        return (
          <G key={`rn-${room.id}`} opacity={faded(room.id)}>
            {[true, false].map((halo) => (
              <SvgText
                key={String(halo)}
                x={q.x}
                y={q.y}
                fontSize={12}
                fontWeight="bold"
                letterSpacing={1.2}
                textAnchor="middle"
                fill={C.ink}
                fillOpacity={0.75}
                stroke={halo ? "#FFFFFF" : undefined}
                strokeWidth={halo ? 4 : 0}
                strokeOpacity={halo ? 0.85 : 0}
                strokeLinejoin="round"
              >
                {name}
              </SvgText>
            ))}
          </G>
        );
      })}

      {/* Item labels as floating tags */}
      {floor.items.filter(showsLabel).map((item) => {
        const z = itemHeight(item) + 10;
        const q = labelAt(item.x + item.w / 2, item.y + item.h / 2, z);
        const text = item.label ?? "";
        const isTable = CATALOG[item.type].legend === "tables";
        const selected = selectedId === item.id;
        const k = selected ? 1.5 : isTable ? 1.15 : 1;
        const wTag = Math.max(24, text.length * 6.4 + 12) * k;
        const hTag = 16 * k;
        const tc = tagColors?.[item.id];
        const bg = tc?.bg ?? (isTable ? C.ink : C.white);
        const fg = tc?.fg ?? (isTable ? C.lime : C.ink);
        return (
          <G key={`lb-${item.id}`} opacity={faded(item.id)}>
            {/* stem from tag to the object so it's clear what the tag belongs to */}
            <Line x1={q.x} y1={q.y + hTag / 2} x2={q.x} y2={q.y + 9} stroke={C.ink} strokeOpacity={0.35} strokeWidth={1} />
            <Rect
              x={q.x - wTag / 2}
              y={q.y - hTag / 2 - 1}
              width={wTag}
              height={hTag}
              rx={hTag / 2}
              fill={bg}
              stroke={selected ? C.ink : C.ink}
              strokeOpacity={selected ? 1 : 0.2}
              strokeWidth={selected ? 2 : 1}
            />
            <SvgText x={q.x} y={q.y + 3.5 * k} fontSize={10 * k} fontWeight="bold" textAnchor="middle" fill={fg}>
              {text}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
