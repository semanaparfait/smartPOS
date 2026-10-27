import AsyncStorage from "@react-native-async-storage/async-storage";
import { CATALOG } from "./catalog";
import { emptyFloor, uid, type Item, type ItemType, type Venue } from "./types";

const KEY = "smartpos.venueMap.v2";
const LEGACY_KEY = "smartpos.floorPlan.v1";

// Old editor kinds -> new item types.
const LEGACY_TYPES: Record<string, ItemType> = {
  table: "table-round",
  bar: "bar-counter",
  restroom: "restroom",
  kitchen: "kitchen-line",
  singledoor: "door",
  doubledoor: "door-double",
};

async function migrateLegacy(): Promise<Venue | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as {
      items?: { id: string; kind: string; x: number; y: number; width: number; height: number; rotation: number }[];
      walls?: { id: string; start: { x: number; y: number }; end: { x: number; y: number }; thickness: number }[];
    };
    const floor = emptyFloor();
    let tableNo = 0;
    floor.items = (old.items ?? []).map((o): Item => {
      const type = LEGACY_TYPES[o.kind] ?? "table-round";
      const isTable = type === "table-round";
      return {
        id: o.id || uid(),
        type,
        x: o.x,
        y: o.y,
        w: Math.max(o.width, isTable ? CATALOG[type].w : 20),
        h: Math.max(o.height, isTable ? CATALOG[type].h : 20),
        rotation: o.rotation || 0,
        label: isTable ? `T${String(++tableNo).padStart(2, "0")}` : CATALOG[type].defaultLabel,
      };
    });
    floor.walls = (old.walls ?? []).map((w) => ({
      id: w.id || uid(),
      start: w.start,
      end: w.end,
      thickness: Math.min(w.thickness || 12, 16),
      kind: "wall" as const,
    }));
    // Grow the floor so nothing from the old 1500×1500 canvas is cut off.
    const maxX = Math.max(floor.w, ...floor.items.map((i) => i.x + i.w + 40), ...floor.walls.map((w) => Math.max(w.start.x, w.end.x) + 40));
    const maxY = Math.max(floor.h, ...floor.items.map((i) => i.y + i.h + 40), ...floor.walls.map((w) => Math.max(w.start.y, w.end.y) + 40));
    floor.w = Math.ceil(maxX / 40) * 40;
    floor.h = Math.ceil(maxY / 40) * 40;
    return { version: 2, floors: [floor] };
  } catch {
    return null;
  }
}

// Older maps used T1, B2... ; show them as T01, B02 like new ones.
function padNumbers(venue: Venue): Venue {
  return {
    ...venue,
    floors: venue.floors.map((f) => ({
      ...f,
      items: f.items.map((i) => {
        const prefix = CATALOG[i.type].prefix;
        const m = i.label && prefix && prefix.length <= 2 ? i.label.match(/^([A-Z])(\d)$/) : null;
        return m ? { ...i, label: `${m[1]}0${m[2]}` } : i;
      }),
    })),
  };
}

export async function loadVenue(): Promise<Venue | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Venue;
      if (parsed?.version === 2 && Array.isArray(parsed.floors) && parsed.floors.length) return padNumbers(parsed);
    }
    return await migrateLegacy();
  } catch (error) {
    console.error("[venueMap] load failed", error);
    return null;
  }
}

export async function saveVenue(venue: Venue): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(venue));
  } catch (error) {
    console.error("[venueMap] save failed", error);
  }
}
