// Seats that are served one by one, like tables: bar stools at a counter and
// lounge armchairs. A bar counter gets real stools (separate, tappable items)
// along its customer side; maps made before that get them when loaded.
//
// Ids are made from the counter's id, so every phone that loads the same map
// gets the same stools (their status is shared through the server by id).
import { CATALOG } from "./catalog";
import type { Floor, Item, ItemType, Venue } from "./types";

const STOOL = CATALOG["bar-stool"];

// Where a counter's stools go, in the counter's own (unrotated) frame: a stool
// every 60 cm in the front half, like the stools that used to be drawn on it.
export function counterStools(counter: Item): Item[] {
  const { w, h } = counter;
  const counterH = h * 0.5;
  const count = Math.max(2, Math.floor(w / 24));
  const ly = counterH + 6 + (h - counterH - 8) / 2;
  const a = ((counter.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return Array.from({ length: count }, (_, i) => {
    const dx = (w / count) * (i + 0.5) - w / 2;
    const dy = ly - h / 2;
    const cx = counter.x + w / 2 + dx * cos - dy * sin;
    const cy = counter.y + h / 2 + dx * sin + dy * cos;
    return {
      id: `${counter.id}-s${i + 1}`,
      type: "bar-stool" as ItemType,
      x: Math.round(cx - STOOL.w / 2),
      y: Math.round(cy - STOOL.h / 2),
      w: STOOL.w,
      h: STOOL.h,
      rotation: counter.rotation || 0,
      seats: 1,
    };
  });
}

// Whether a stool already stands at this counter (inside its rotated box).
function hasStools(floor: Floor, counter: Item) {
  const a = (-(counter.rotation || 0) * Math.PI) / 180;
  const ccx = counter.x + counter.w / 2;
  const ccy = counter.y + counter.h / 2;
  return floor.items.some((i) => {
    if (i.type !== "bar-stool") return false;
    const px = i.x + i.w / 2 - ccx;
    const py = i.y + i.h / 2 - ccy;
    const lx = px * Math.cos(a) - py * Math.sin(a);
    const ly = px * Math.sin(a) + py * Math.cos(a);
    return Math.abs(lx) <= counter.w / 2 + 4 && Math.abs(ly) <= counter.h / 2 + 30;
  });
}

const SEAT_TYPES: ItemType[] = ["bar-stool", "armchair"];

// Adds stools to counters that have none and numbers unnamed seats (S01, L01…).
// Returns the same object when nothing needed changing.
export function withSeats(venue: Venue): Venue {
  let changed = false;
  const floors = venue.floors.map((floor) => {
    const added: Item[] = [];
    for (const item of floor.items)
      if (item.type === "bar-counter" && !hasStools(floor, item)) added.push(...counterStools(item));
    if (added.length) changed = true;
    return added.length ? { ...floor, items: [...floor.items, ...added] } : floor;
  });

  // Number seats without a name, after the highest number already used.
  const next: Record<string, number> = {};
  for (const type of SEAT_TYPES) {
    const prefix = CATALOG[type].prefix!;
    const used = floors
      .flatMap((f) => f.items)
      .map((i) => i.label ?? "")
      .filter((l) => l.startsWith(prefix))
      .map((l) => parseInt(l.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    next[type] = used.length ? Math.max(...used) : 0;
  }
  const named = floors.map((floor) => {
    let touched = false;
    const items = floor.items.map((i) => {
      if (!SEAT_TYPES.includes(i.type) || i.label) return i;
      touched = true;
      next[i.type] += 1;
      return { ...i, label: `${CATALOG[i.type].prefix}${String(next[i.type]).padStart(2, "0")}`, seats: 1 };
    });
    if (touched) changed = true;
    return touched ? { ...floor, items } : floor;
  });

  return changed ? { ...venue, floors: named } : venue;
}
