import AsyncStorage from "@react-native-async-storage/async-storage";
import { CATALOG } from "./catalog";
import { emptyFloor, uid, type Item, type ItemType, type Venue } from "./types";
import { fetchLayout, putLayout, VenueError } from "@/store/Venue/venueApi";
import { withSeats } from "./seats";

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

const isVenue = (v: unknown): v is Venue =>
  !!v && (v as Venue).version === 2 && Array.isArray((v as Venue).floors) && (v as Venue).floors.length > 0;

// This device's copy: used when the server can't be reached, and to bring a map
// drawn before maps were saved online up to the server.
async function loadLocal(): Promise<Venue | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isVenue(parsed)) return withSeats(padNumbers(parsed));
    }
    const legacy = await migrateLegacy();
    return legacy && withSeats(legacy);
  } catch (error) {
    console.error("[venueMap] load failed", error);
    return null;
  }
}

const keepLocal = (venue: Venue) =>
  AsyncStorage.setItem(KEY, JSON.stringify(venue)).catch((error) => console.error("[venueMap] save failed", error));

// The server's version of the map we last loaded or saved, and its content,
// so an unchanged map isn't sent again.
let serverVersion: number | undefined;
let lastSynced: string | null = null;

export type LoadedVenue = { venue: Venue | null; online: boolean; onServer: boolean };

// The company's map from the server (every worker sees the same one), or this
// device's copy when offline.
export async function loadVenueFrom(): Promise<LoadedVenue> {
  try {
    const remote = await fetchLayout();
    serverVersion = remote.version;
    if (isVenue(remote.layout)) {
      const saved = padNumbers(remote.layout);
      // What the server has; when bar stools are added below, the owner's
      // editor sends the map with them on its next save.
      lastSynced = JSON.stringify(saved);
      const venue = withSeats(saved);
      keepLocal(venue);
      return { venue, online: true, onServer: true };
    }
    lastSynced = null;
    // Nothing saved online yet: show what this device has; the editor uploads it.
    return { venue: await loadLocal(), online: true, onServer: false };
  } catch {
    return { venue: await loadLocal(), online: false, onServer: false };
  }
}

export async function loadVenue(): Promise<Venue | null> {
  return (await loadVenueFrom()).venue;
}

export type SaveResult =
  | { ok: true }
  // offline: kept on this device, sent with the next change.
  | { ok: false; offline: boolean; message: string };

export async function saveVenue(venue: Venue): Promise<SaveResult> {
  await keepLocal(venue);
  const body = JSON.stringify(venue);
  if (body === lastSynced) return { ok: true };
  try {
    const saved = await putLayout(venue, serverVersion);
    serverVersion = saved.version;
    lastSynced = body;
    return { ok: true };
  } catch (error) {
    const status = error instanceof VenueError ? error.status : 0;
    const message = error instanceof Error ? error.message : "Could not save the map";
    return { ok: false, offline: status === 0 || status >= 500, message };
  }
}
