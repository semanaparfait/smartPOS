// Walking routes on a floor: grid A* around walls and furniture, then smoothed.
import { PX_PER_M, type Floor, type Item, type Point, type Room } from "./types";

const CELL = 10; // 25 cm
const CLEARANCE = 6;

// Things you can walk over or through.
const WALKABLE = new Set([
  "door",
  "door-double",
  "entrance",
  "dance-floor",
  "label",
  "you-are-here",
  "restroom",
  "exit",
  "info",
]);

type Grid = { cols: number; rows: number; blocked: Uint8Array };

function corners(item: Item, pad: number): Point[] {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  const a = (item.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = item.w / 2 + pad;
  const hh = item.h / 2 + pad;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c }));
}

function insidePoly(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const gridCache = new WeakMap<Floor, Grid>();

function buildGrid(floor: Floor): Grid {
  const cached = gridCache.get(floor);
  if (cached) return cached;
  const cols = Math.ceil(floor.w / CELL);
  const rows = Math.ceil(floor.h / CELL);
  const blocked = new Uint8Array(cols * rows);
  const center = (c: number, r: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

  for (const wall of floor.walls) {
    const reach = (wall.kind === "railing" ? 3 : wall.thickness / 2) + CLEARANCE;
    const minC = Math.max(0, Math.floor((Math.min(wall.start.x, wall.end.x) - reach) / CELL));
    const maxC = Math.min(cols - 1, Math.ceil((Math.max(wall.start.x, wall.end.x) + reach) / CELL));
    const minR = Math.max(0, Math.floor((Math.min(wall.start.y, wall.end.y) - reach) / CELL));
    const maxR = Math.min(rows - 1, Math.ceil((Math.max(wall.start.y, wall.end.y) + reach) / CELL));
    for (let r = minR; r <= maxR; r++)
      for (let c = minC; c <= maxC; c++) if (distToSegment(center(c, r), wall.start, wall.end) < reach) blocked[r * cols + c] = 1;
  }

  for (const item of floor.items) {
    if (WALKABLE.has(item.type)) continue;
    const poly = corners(item, 2);
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    for (let r = Math.max(0, Math.floor(Math.min(...ys) / CELL)); r <= Math.min(rows - 1, Math.ceil(Math.max(...ys) / CELL)); r++)
      for (let c = Math.max(0, Math.floor(Math.min(...xs) / CELL)); c <= Math.min(cols - 1, Math.ceil(Math.max(...xs) / CELL)); c++)
        if (insidePoly(center(c, r), poly)) blocked[r * cols + c] = 1;
  }

  const grid = { cols, rows, blocked };
  gridCache.set(floor, grid);
  return grid;
}

// Nearest walkable cell to a point (breadth-first outward).
function nearestFree(grid: Grid, p: Point) {
  const c0 = Math.min(grid.cols - 1, Math.max(0, Math.floor(p.x / CELL)));
  const r0 = Math.min(grid.rows - 1, Math.max(0, Math.floor(p.y / CELL)));
  if (!grid.blocked[r0 * grid.cols + c0]) return r0 * grid.cols + c0;
  for (let d = 1; d < 40; d++)
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (r >= 0 && c >= 0 && r < grid.rows && c < grid.cols && !grid.blocked[r * grid.cols + c]) return r * grid.cols + c;
      }
  return -1;
}

function lineClear(grid: Grid, a: Point, b: Point) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 1; i < steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (grid.blocked[Math.floor(y / CELL) * grid.cols + Math.floor(x / CELL)]) return false;
  }
  return true;
}

export type Destination = { kind: "item"; item: Item } | { kind: "room"; room: Room };
export type Route = { points: Point[]; metres: number };

export function findRoute(floor: Floor, from: Point, to: Destination): Route | null {
  const grid = buildGrid(floor);
  const start = nearestFree(grid, from);
  if (start < 0) return null;

  // Goal: any free cell touching the destination (beside a table, inside a room).
  const goal = new Uint8Array(grid.cols * grid.rows);
  let target: Point;
  if (to.kind === "item") {
    const ring = corners(to.item, 16);
    target = { x: to.item.x + to.item.w / 2, y: to.item.y + to.item.h / 2 };
    for (let i = 0; i < goal.length; i++) {
      if (grid.blocked[i]) continue;
      const p = { x: (i % grid.cols) * CELL + CELL / 2, y: Math.floor(i / grid.cols) * CELL + CELL / 2 };
      if (insidePoly(p, ring)) goal[i] = 1;
    }
  } else {
    const r = to.room;
    target = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    for (let i = 0; i < goal.length; i++) {
      if (grid.blocked[i]) continue;
      const x = (i % grid.cols) * CELL + CELL / 2;
      const y = Math.floor(i / grid.cols) * CELL + CELL / 2;
      if (x > r.x + 12 && x < r.x + r.w - 12 && y > r.y + 12 && y < r.y + r.h - 12) goal[i] = 1;
    }
  }

  // A* with a binary heap, 8 directions.
  const n = grid.cols * grid.rows;
  const g = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const h = (i: number) => {
    const dx = Math.abs((i % grid.cols) * CELL - target.x);
    const dy = Math.abs(Math.floor(i / grid.cols) * CELL - target.y);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };

  g[start] = 0;
  push(h(start), start);
  let end = -1;
  while (heap.length) {
    const [, i] = pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (goal[i]) {
      end = i;
      break;
    }
    const c = i % grid.cols;
    const r = Math.floor(i / grid.cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) continue;
        const j = nr * grid.cols + nc;
        if (grid.blocked[j] || closed[j]) continue;
        // No cutting corners between two blocked cells.
        if (dr && dc && (grid.blocked[r * grid.cols + nc] || grid.blocked[nr * grid.cols + c])) continue;
        const cost = g[i] + (dr && dc ? CELL * 1.414 : CELL);
        if (cost < g[j]) {
          g[j] = cost;
          came[j] = i;
          push(cost + h(j), j);
        }
      }
  }
  if (end < 0) return null;

  const raw: Point[] = [];
  for (let i = end; i >= 0; i = came[i]) raw.push({ x: (i % grid.cols) * CELL + CELL / 2, y: Math.floor(i / grid.cols) * CELL + CELL / 2 });
  raw.reverse();
  raw[0] = from;

  // String-pull: keep only the turns needed to stay clear of obstacles.
  const pts: Point[] = [raw[0]];
  let anchor = 0;
  for (let i = 2; i < raw.length; i++) {
    if (!lineClear(grid, raw[anchor], raw[i])) {
      pts.push(raw[i - 1]);
      anchor = i - 1;
    }
  }
  pts.push(raw[raw.length - 1]);

  const units = pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
  return { points: pts, metres: units / PX_PER_M };
}

// Shortest route among several candidates (e.g. the nearest restroom).
export function findNearest(floor: Floor, from: Point, options: Destination[]) {
  let best: { route: Route; dest: Destination } | null = null;
  for (const dest of options.slice(0, 16)) {
    const route = findRoute(floor, from, dest);
    if (route && (!best || route.metres < best.route.metres)) best = { route, dest };
  }
  return best;
}
