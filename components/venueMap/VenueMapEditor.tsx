// Owner-facing venue map designer.
import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { G } from "react-native-svg";
import { CATALOG, CATEGORIES, MATERIALS, drawItem, isTable, type Category } from "./catalog";
import FloorRenderer from "./FloorRenderer";
import { loadVenue, saveVenue } from "./storage";
import { TEMPLATES } from "./templates";
import {
  emptyFloor,
  formatMetres,
  GRID,
  PX_PER_M,
  snap,
  uid,
  type Floor,
  type Item,
  type ItemType,
  type Material,
  type Point,
  type Room,
  type Venue,
  type Wall,
  type WallKind,
} from "./types";
import VenueMapViewer from "./VenueMapViewer";

type Mode = "select" | "wall" | "room";
type Selection = { kind: "item" | "room" | "wall"; id: string } | null;

const PAD = 24;
const WALL_KINDS: { key: WallKind; label: string }[] = [
  { key: "wall", label: "Wall" },
  { key: "window", label: "Window" },
  { key: "glass", label: "Glass" },
  { key: "railing", label: "Railing" },
];

const confirmAsync = (title: string, message: string) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === "web") return resolve(window.confirm(`${title}\n\n${message}`));
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", style: "destructive", onPress: () => resolve(true) },
    ]);
  });

const hasContent = (v: Venue) => v.floors.some((f) => f.items.length || f.walls.length || f.rooms.length);

/* ---------- small UI pieces ---------- */

function ToolButton({
  icon,
  label,
  active,
  onPress,
  disabled,
}: {
  icon: string;
  label?: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`h-9 flex-row items-center justify-center rounded-lg ${label ? "px-3" : "w-9"} ${
        active ? "bg-ink" : disabled ? "opacity-35" : "active:bg-ivory"
      }`}
    >
      <Ionicons name={icon as any} size={16} color={active ? brand.lime : brand.ink} />
      {label ? (
        <Text className={`text-xs font-bold ml-1.5 ${active ? "text-white" : "text-ink"}`}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

function PanelTitle({ children }: { children: string }) {
  return <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mb-2">{children}</Text>;
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={brand.inkDisabled}
      className="bg-ivory border border-ink/10 rounded-lg px-3 h-10 text-[13px] text-ink"
      style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
    />
  );
}

// Numeric field in metres; commits on blur / submit.
function MetreField({ label, units, onCommit, min = 0.25 }: { label: string; units: number; onCommit: (u: number) => void; min?: number }) {
  const [text, setText] = useState((units / PX_PER_M).toFixed(2).replace(/\.?0+$/, ""));
  useEffect(() => {
    setText((units / PX_PER_M).toFixed(2).replace(/\.?0+$/, ""));
  }, [units]);
  const commit = () => {
    const v = parseFloat(text.replace(",", "."));
    if (!isNaN(v) && v >= min) onCommit(Math.round(v * PX_PER_M));
    else setText((units / PX_PER_M).toFixed(2).replace(/\.?0+$/, ""));
  };
  return (
    <View className="flex-1 flex-row items-center bg-ivory border border-ink/10 rounded-lg px-2.5 h-10">
      <Text className="text-ink/40 text-xs font-bold w-4">{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        className="flex-1 text-[13px] text-ink font-semibold"
        style={Platform.OS === "web" ? ({ outlineStyle: "none", minWidth: 0 } as any) : undefined}
      />
      <Text className="text-ink/40 text-[11px]">m</Text>
    </View>
  );
}

function Stepper({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string }) {
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-lg h-10">
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} className="w-10 h-10 items-center justify-center active:bg-ink/5">
        <Ionicons name="remove" size={16} color={brand.ink} />
      </Pressable>
      <Text className="flex-1 text-center text-ink text-[13px] font-bold">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} className="w-10 h-10 items-center justify-center active:bg-ink/5">
        <Ionicons name="add" size={16} color={brand.ink} />
      </Pressable>
    </View>
  );
}

function ItemPreview({ type, size = 52 }: { type: ItemType; size?: number }) {
  const entry = CATALOG[type];
  const pad = 6;
  return (
    <Svg width={size} height={size} viewBox={`${-pad} ${-pad} ${entry.w + pad * 2} ${entry.h + pad * 2}`}>
      <G>{drawItem({ type, w: entry.w, h: entry.h, seats: entry.seats })}</G>
    </Svg>
  );
}

/* ---------- editor ---------- */

export default function VenueMapEditor() {
  const { width } = useWindowDimensions();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [wallKind, setWallKind] = useState<WallKind>("wall");
  const [roomMaterial, setRoomMaterial] = useState<Material>("wood");
  const [roomWalls, setRoomWalls] = useState(true);
  const [scale, setScale] = useState<number | null>(null);
  const [category, setCategory] = useState<Category>("Seating");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const undoStack = useRef<Venue[]>([]);
  const redoStack = useRef<Venue[]>([]);
  const [, forceHistory] = useState(0);
  const loaded = useRef(false);
  const scroll = useRef({ x: 0, y: 0 });
  const gesture = useRef<{
    pageX: number;
    pageY: number;
    before: Venue;
    origin: any;
    moved: boolean;
  } | null>(null);

  const isWide = width >= 1200;

  /* load + autosave */
  useEffect(() => {
    (async () => {
      const stored = await loadVenue();
      const v = stored ?? { version: 2 as const, floors: [emptyFloor()] };
      setVenue(v);
      setFloorId(v.floors[0].id);
      loaded.current = true;
      if (!stored || !hasContent(v)) setTemplatesOpen(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current || !venue) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      await saveVenue(venue);
      setSaveState("saved");
    }, 500);
    return () => clearTimeout(t);
  }, [venue]);

  const floor: Floor | null = venue?.floors.find((f) => f.id === floorId) ?? venue?.floors[0] ?? null;

  // Fit the floor to the viewport the first time we know both.
  useEffect(() => {
    if (scale === null && floor && viewport.w > 0) {
      setScale(Math.max(0.3, Math.min(1.5, Math.min((viewport.w - PAD * 2) / floor.w, (viewport.h - PAD * 2) / floor.h))));
    }
  }, [viewport, floor, scale]);

  /* history */
  const commit = (next: Venue, before?: Venue) => {
    if (venue) {
      undoStack.current.push(before ?? venue);
      if (undoStack.current.length > 60) undoStack.current.shift();
      redoStack.current = [];
      forceHistory((n) => n + 1);
    }
    setVenue(next);
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev || !venue) return;
    redoStack.current.push(venue);
    setVenue(prev);
    setSelection(null);
    forceHistory((n) => n + 1);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next || !venue) return;
    undoStack.current.push(venue);
    setVenue(next);
    setSelection(null);
    forceHistory((n) => n + 1);
  };

  const mapFloor = (v: Venue, fn: (f: Floor) => Floor): Venue => ({
    ...v,
    floors: v.floors.map((f) => (f.id === (floor?.id ?? "") ? fn(f) : f)),
  });
  const updateFloor = (fn: (f: Floor) => Floor) => venue && commit(mapFloor(venue, fn));
  const liveUpdate = (fn: (f: Floor) => Floor) => setVenue((v) => (v ? mapFloor(v, fn) : v));

  /* selection helpers */
  const selectedItem = selection?.kind === "item" ? floor?.items.find((i) => i.id === selection.id) : undefined;
  const selectedRoom = selection?.kind === "room" ? floor?.rooms.find((r) => r.id === selection.id) : undefined;
  const selectedWall = selection?.kind === "wall" ? floor?.walls.find((w) => w.id === selection.id) : undefined;

  const patchItem = (id: string, patch: Partial<Item>) =>
    updateFloor((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const patchRoom = (id: string, patch: Partial<Room>) =>
    updateFloor((f) => ({ ...f, rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const patchWall = (id: string, patch: Partial<Wall>) =>
    updateFloor((f) => ({ ...f, walls: f.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  const deleteSelection = () => {
    if (!selection) return;
    updateFloor((f) => ({
      ...f,
      items: selection.kind === "item" ? f.items.filter((i) => i.id !== selection.id) : f.items,
      rooms: selection.kind === "room" ? f.rooms.filter((r) => r.id !== selection.id) : f.rooms,
      walls: selection.kind === "wall" ? f.walls.filter((w) => w.id !== selection.id) : f.walls,
    }));
    setSelection(null);
  };

  const nextLabel = (type: ItemType) => {
    const prefix = CATALOG[type].prefix;
    if (!prefix || !venue) return CATALOG[type].defaultLabel;
    const used = venue.floors
      .flatMap((f) => f.items)
      .map((i) => i.label ?? "")
      .filter((l) => l.startsWith(prefix))
      .map((l) => parseInt(l.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const n = (used.length ? Math.max(...used) : 0) + 1;
    // Short prefixes are numbered T01, T02... ; words ("Aisle ") are not padded.
    return prefix.length <= 2 ? `${prefix}${String(n).padStart(2, "0")}` : `${prefix}${n}`;
  };

  const addItem = (type: ItemType) => {
    if (!floor || !scale) return;
    const entry = CATALOG[type];
    const cx = (scroll.current.x + viewport.w / 2 - PAD) / scale;
    const cy = (scroll.current.y + viewport.h / 2 - PAD) / scale;
    const item: Item = {
      id: uid(),
      type,
      x: snap(Math.min(Math.max(cx - entry.w / 2, 0), floor.w - entry.w)),
      y: snap(Math.min(Math.max(cy - entry.h / 2, 0), floor.h - entry.h)),
      w: entry.w,
      h: entry.h,
      rotation: 0,
      label: nextLabel(type),
      seats: entry.seats,
    };
    updateFloor((f) => ({ ...f, items: [...f.items, item] }));
    setSelection({ kind: "item", id: item.id });
    setMode("select");
    if (!isWide) setLibraryOpen(false);
  };

  const duplicateItem = (item: Item) => {
    const copy: Item = { ...item, id: uid(), x: item.x + 20, y: item.y + 20, label: CATALOG[item.type].prefix ? nextLabel(item.type) : item.label };
    updateFloor((f) => ({ ...f, items: [...f.items, copy] }));
    setSelection({ kind: "item", id: copy.id });
  };

  const applyTemplate = async (key: string) => {
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (!tpl || !venue) return;
    if (hasContent(venue)) {
      const ok = await confirmAsync("Replace current map?", "Your current layout will be replaced. You can undo this.");
      if (!ok) return;
    }
    const next = tpl.build();
    commit(next);
    setFloorId(next.floors[0].id);
    setSelection(null);
    setScale(null);
    setTemplatesOpen(false);
  };

  /* web keyboard shortcuts */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        deleteSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "Escape") {
        setSelection(null);
        setMode("select");
        setDraft(null);
      } else if (e.key.toLowerCase() === "r" && selectedItem) {
        patchItem(selectedItem.id, { rotation: (selectedItem.rotation + 90) % 360 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!venue || !floor) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <Text className="text-ink/40 text-xs">Loading map...</Text>
      </View>
    );
  }

  if (preview) {
    return (
      <VenueMapViewer
        venue={venue}
        title="Preview"
        subtitle="This is what staff and visitors see."
        idPrefix="vmp"
        headerRight={
          <Pressable onPress={() => setPreview(false)} className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink-soft">
            <Ionicons name="create-outline" size={15} color={brand.lime} />
            <Text className="text-white text-[13px] font-bold ml-2">Back to editing</Text>
          </Pressable>
        }
      />
    );
  }

  const s = scale ?? 0.6;

  /* ---------- gestures ---------- */

  const startGesture = (e: GestureResponderEvent, origin: any) => {
    gesture.current = { pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, before: venue, origin, moved: false };
    setDragging(true);
  };
  const delta = (e: GestureResponderEvent) => {
    const g = gesture.current!;
    return { dx: (e.nativeEvent.pageX - g.pageX) / s, dy: (e.nativeEvent.pageY - g.pageY) / s };
  };
  const endGesture = () => {
    const g = gesture.current;
    if (g?.moved && venue) {
      undoStack.current.push(g.before);
      redoStack.current = [];
      forceHistory((n) => n + 1);
    }
    gesture.current = null;
    setDragging(false);
  };

  // An existing wall end within reach (so walls join cleanly), if any.
  const endpointNear = (p: Point): Point | null => {
    let best: Point | null = null;
    let dist = 14 / Math.max(0.5, s);
    for (const w of floor.walls) {
      for (const q of [w.start, w.end]) {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < dist) {
          dist = d;
          best = q;
        }
      }
    }
    return best;
  };
  const nearestEndpoint = (p: Point): Point => endpointNear(p) ?? { x: snap(p.x), y: snap(p.y) };

  const canvasHandlers = {
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => mode === "select",
    onResponderGrant: (e: GestureResponderEvent) => {
      if (mode === "select") return;
      const p = nearestEndpoint({ x: e.nativeEvent.locationX / s, y: e.nativeEvent.locationY / s });
      gesture.current = { pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, before: venue, origin: p, moved: false };
      setDraft({ start: p, end: p });
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (mode === "select" || !gesture.current) return;
      const { dx, dy } = delta(e);
      const start = gesture.current.origin as Point;
      let end = { x: start.x + dx, y: start.y + dy };
      if (mode === "wall") {
        // Prefer joining an existing wall end; otherwise keep near-straight lines straight.
        const joint = endpointNear(end);
        if (joint) {
          end = joint;
        } else {
          const ax = Math.abs(end.x - start.x);
          const ay = Math.abs(end.y - start.y);
          end = {
            x: ay > ax * 3 ? start.x : snap(end.x),
            y: ax > ay * 3 ? start.y : snap(end.y),
          };
        }
      } else {
        end = { x: snap(end.x), y: snap(end.y) };
      }
      setDraft({ start, end });
    },
    onResponderRelease: () => {
      if (mode === "select") {
        setSelection(null);
        return;
      }
      const d = draft;
      gesture.current = null;
      setDraft(null);
      if (!d) return;
      if (mode === "wall") {
        if (Math.hypot(d.end.x - d.start.x, d.end.y - d.start.y) < GRID) return;
        const wall: Wall = { id: uid(), start: d.start, end: d.end, thickness: wallKind === "railing" ? 6 : 12, kind: wallKind };
        updateFloor((f) => ({ ...f, walls: [...f.walls, wall] }));
      } else {
        const x = Math.min(d.start.x, d.end.x);
        const y = Math.min(d.start.y, d.end.y);
        const w = Math.abs(d.end.x - d.start.x);
        const h = Math.abs(d.end.y - d.start.y);
        if (w < 40 || h < 40) return;
        const room: Room = { id: uid(), name: `Room ${floor.rooms.length + 1}`, x, y, w, h, material: roomMaterial };
        const walls: Wall[] = roomWalls
          ? [
              [x, y, x + w, y],
              [x + w, y, x + w, y + h],
              [x + w, y + h, x, y + h],
              [x, y + h, x, y],
            ].map(([x1, y1, x2, y2]) => ({ id: uid(), start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 10, kind: "wall" as WallKind }))
          : [];
        updateFloor((f) => ({ ...f, rooms: [...f.rooms, room], walls: [...f.walls, ...walls] }));
        setSelection({ kind: "room", id: room.id });
        setMode("select");
      }
    },
  };

  const itemHandlers = (item: Item) => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      setSelection({ kind: "item", id: item.id });
      startGesture(e, { x: item.x, y: item.y });
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { dx, dy } = delta(e);
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      gesture.current!.moved = true;
      const o = gesture.current!.origin;
      liveUpdate((f) => ({ ...f, items: f.items.map((i) => (i.id === item.id ? { ...i, x: snap(o.x + dx), y: snap(o.y + dy) } : i)) }));
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  });

  const roomHandlers = (room: Room) => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      setSelection({ kind: "room", id: room.id });
      // Moving a room carries its furniture and the walls around it.
      const inside = (x: number, y: number) => x >= room.x - 8 && x <= room.x + room.w + 8 && y >= room.y - 8 && y <= room.y + room.h + 8;
      startGesture(e, {
        room: { x: room.x, y: room.y },
        items: floor.items.filter((i) => inside(i.x + i.w / 2, i.y + i.h / 2)).map((i) => ({ id: i.id, x: i.x, y: i.y })),
        walls: floor.walls.filter((w) => inside(w.start.x, w.start.y) && inside(w.end.x, w.end.y)).map((w) => ({ id: w.id, start: w.start, end: w.end })),
      });
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { dx: rdx, dy: rdy } = delta(e);
      if (Math.abs(rdx) + Math.abs(rdy) < 1) return;
      gesture.current!.moved = true;
      const o = gesture.current!.origin;
      const dx = snap(o.room.x + rdx) - o.room.x;
      const dy = snap(o.room.y + rdy) - o.room.y;
      const itemMap = new Map<string, { x: number; y: number }>(o.items.map((i: any) => [i.id, i]));
      const wallMap = new Map<string, { start: Point; end: Point }>(o.walls.map((w: any) => [w.id, w]));
      liveUpdate((f) => ({
        ...f,
        rooms: f.rooms.map((r) => (r.id === room.id ? { ...r, x: o.room.x + dx, y: o.room.y + dy } : r)),
        items: f.items.map((i) => {
          const io = itemMap.get(i.id);
          return io ? { ...i, x: io.x + dx, y: io.y + dy } : i;
        }),
        walls: f.walls.map((w) => {
          const wo = wallMap.get(w.id);
          return wo ? { ...w, start: { x: wo.start.x + dx, y: wo.start.y + dy }, end: { x: wo.end.x + dx, y: wo.end.y + dy } } : w;
        }),
      }));
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  });

  const wallHandlers = (wall: Wall) => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      setSelection({ kind: "wall", id: wall.id });
      startGesture(e, { start: wall.start, end: wall.end });
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { dx: rdx, dy: rdy } = delta(e);
      if (Math.abs(rdx) + Math.abs(rdy) < 1) return;
      gesture.current!.moved = true;
      const o = gesture.current!.origin;
      const dx = snap(o.start.x + rdx) - o.start.x;
      const dy = snap(o.start.y + rdy) - o.start.y;
      liveUpdate((f) => ({
        ...f,
        walls: f.walls.map((w) =>
          w.id === wall.id ? { ...w, start: { x: o.start.x + dx, y: o.start.y + dy }, end: { x: o.end.x + dx, y: o.end.y + dy } } : w,
        ),
      }));
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  });

  const endpointHandlers = (wall: Wall, which: "start" | "end") => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => startGesture(e, { ...wall[which] }),
    onResponderMove: (e: GestureResponderEvent) => {
      const { dx, dy } = delta(e);
      gesture.current!.moved = true;
      const o = gesture.current!.origin as Point;
      const p = nearestEndpoint({ x: o.x + dx, y: o.y + dy });
      liveUpdate((f) => ({ ...f, walls: f.walls.map((w) => (w.id === wall.id ? { ...w, [which]: p } : w)) }));
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  });

  const resizeHandlers = (kind: "item" | "room", target: Item | Room) => ({
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => startGesture(e, { w: target.w, h: target.h }),
    onResponderMove: (e: GestureResponderEvent) => {
      let { dx, dy } = delta(e);
      gesture.current!.moved = true;
      if (kind === "item") {
        // Resize along the item's own axes when it is rotated.
        const a = (-(target as Item).rotation * Math.PI) / 180;
        [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
      }
      const o = gesture.current!.origin;
      const w = Math.max(kind === "room" ? 40 : 10, snap(o.w + dx));
      const h = Math.max(kind === "room" ? 40 : 10, snap(o.h + dy));
      liveUpdate((f) =>
        kind === "item"
          ? { ...f, items: f.items.map((i) => (i.id === target.id ? { ...i, w, h } : i)) }
          : { ...f, rooms: f.rooms.map((r) => (r.id === target.id ? { ...r, w, h } : r)) },
      );
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  });

  /* ---------- panels ---------- */

  const library = (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden" style={{ width: 250, maxHeight: "100%" }}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-ink text-[15px] font-extrabold tracking-tight">Add to map</Text>
        {!isWide && (
          <Pressable onPress={() => setLibraryOpen(false)} className="w-8 h-8 items-center justify-center rounded-lg active:bg-ivory">
            <Ionicons name="close" size={18} color={brand.ink} />
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 10 }}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            className={`px-3 h-8 rounded-full items-center justify-center border ${category === c ? "bg-ink border-ink" : "border-ink/10 active:bg-ivory"}`}
          >
            <Text className={`text-xs font-bold ${category === c ? "text-lime" : "text-ink/60"}`}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 12, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {(Object.keys(CATALOG) as ItemType[])
            .filter((t) => CATALOG[t].category === category)
            .map((t) => (
              <Pressable
                key={t}
                onPress={() => addItem(t)}
                className="items-center rounded-xl border border-ink/5 bg-ivory pt-2 pb-2 active:bg-lime/30"
                style={{ width: 107 }}
              >
                <View style={{ height: 56, justifyContent: "center" }}>
                  {t === "label" ? <Text className="text-ink text-lg font-extrabold">Aa</Text> : <ItemPreview type={t} />}
                </View>
                <Text numberOfLines={1} className="text-ink text-[11px] font-semibold mt-1 px-1">{CATALOG[t].name}</Text>
              </Pressable>
            ))}
        </View>
        <Text className="text-ink/40 text-[11px] mt-3 leading-4">Tap to place in the middle of the view, then drag it into position.</Text>
      </ScrollView>
    </View>
  );

  const totalSeats = floor.items.filter((i) => isTable(i.type)).reduce((n, i) => n + (i.seats ?? 0), 0);

  const properties = (
    <View className="bg-white rounded-2xl border border-ink/5" style={{ width: 280 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        {selectedItem ? (
          <>
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-ivory items-center justify-center">
                {selectedItem.type === "label" ? <Text className="text-ink font-extrabold">Aa</Text> : <ItemPreview type={selectedItem.type} size={36} />}
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-ink text-[15px] font-extrabold">{CATALOG[selectedItem.type].name}</Text>
                <Text className="text-ink/40 text-[11px]">{CATALOG[selectedItem.type].category}</Text>
              </View>
              <Pressable onPress={() => setSelection(null)} className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="close" size={16} color={brand.inkMuted} />
              </Pressable>
            </View>
            <View>
              <PanelTitle>{selectedItem.type === "label" ? "Text" : "Name / number"}</PanelTitle>
              <TextField value={selectedItem.label ?? ""} onChange={(v) => patchItem(selectedItem.id, { label: v })} placeholder="e.g. T12, Bar, VIP" />
            </View>
            {isTable(selectedItem.type) && (
              <View>
                <PanelTitle>Seats</PanelTitle>
                <Stepper value={selectedItem.seats ?? 0} min={0} max={selectedItem.type === "table-square" ? 4 : 16} onChange={(v) => patchItem(selectedItem.id, { seats: v })} />
              </View>
            )}
            <View>
              <PanelTitle>Size</PanelTitle>
              <View className="flex-row" style={{ gap: 8 }}>
                <MetreField label="W" units={selectedItem.w} onCommit={(w) => patchItem(selectedItem.id, { w })} />
                <MetreField label="H" units={selectedItem.h} onCommit={(h) => patchItem(selectedItem.id, { h })} />
              </View>
            </View>
            <View>
              <PanelTitle>{`Rotation · ${selectedItem.rotation}°`}</PanelTitle>
              <View className="flex-row" style={{ gap: 6 }}>
                {[
                  { label: "−15°", d: -15 },
                  { label: "+15°", d: 15 },
                  { label: "90°", d: 90 },
                ].map((r) => (
                  <Pressable
                    key={r.label}
                    onPress={() => patchItem(selectedItem.id, { rotation: (((selectedItem.rotation + r.d) % 360) + 360) % 360 })}
                    className="flex-1 h-10 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory"
                  >
                    <Text className="text-ink text-xs font-bold">{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable onPress={() => duplicateItem(selectedItem)} className="flex-1 flex-row items-center justify-center h-10 rounded-lg border border-ink/10 active:bg-ivory">
                <Ionicons name="copy-outline" size={15} color={brand.ink} />
                <Text className="text-ink text-xs font-bold ml-1.5">Duplicate</Text>
              </Pressable>
              <Pressable onPress={deleteSelection} className="flex-1 flex-row items-center justify-center h-10 rounded-lg border border-ink/10 active:bg-red-50">
                <Ionicons name="trash-outline" size={15} color={brand.danger} />
                <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>Delete</Text>
              </Pressable>
            </View>
          </>
        ) : selectedRoom ? (
          <>
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: MATERIALS[selectedRoom.material].base }}>
                <Ionicons name="square-outline" size={18} color={brand.ink} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-ink text-[15px] font-extrabold">Room / area</Text>
                <Text className="text-ink/40 text-[11px]">
                  {formatMetres(selectedRoom.w)} × {formatMetres(selectedRoom.h)} · {Math.round((selectedRoom.w / PX_PER_M) * (selectedRoom.h / PX_PER_M))} m²
                </Text>
              </View>
              <Pressable onPress={() => setSelection(null)} className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="close" size={16} color={brand.inkMuted} />
              </Pressable>
            </View>
            <View>
              <PanelTitle>Name</PanelTitle>
              <TextField value={selectedRoom.name} onChange={(v) => patchRoom(selectedRoom.id, { name: v })} placeholder="e.g. Dining hall, Kitchen" />
            </View>
            <View>
              <PanelTitle>Floor</PanelTitle>
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {(Object.keys(MATERIALS) as Material[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => patchRoom(selectedRoom.id, { material: m })}
                    className={`flex-row items-center rounded-lg pl-1.5 pr-2.5 h-9 border ${selectedRoom.material === m ? "border-ink bg-ivory" : "border-ink/10 active:bg-ivory"}`}
                  >
                    <View className="w-6 h-6 rounded-md border border-ink/10" style={{ backgroundColor: MATERIALS[m].base }} />
                    <Text className="text-ink text-xs font-semibold ml-1.5">{MATERIALS[m].name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <PanelTitle>Size</PanelTitle>
              <View className="flex-row" style={{ gap: 8 }}>
                <MetreField label="W" units={selectedRoom.w} min={1} onCommit={(w) => patchRoom(selectedRoom.id, { w })} />
                <MetreField label="H" units={selectedRoom.h} min={1} onCommit={(h) => patchRoom(selectedRoom.id, { h })} />
              </View>
              <Text className="text-ink/40 text-[11px] mt-2">Dragging a room also moves the furniture and walls inside it.</Text>
            </View>
            <Pressable onPress={deleteSelection} className="flex-row items-center justify-center h-10 rounded-lg border border-ink/10 active:bg-red-50">
              <Ionicons name="trash-outline" size={15} color={brand.danger} />
              <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>Delete room (keeps walls)</Text>
            </Pressable>
          </>
        ) : selectedWall ? (
          <>
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-ink items-center justify-center">
                <Ionicons name="remove-outline" size={22} color={brand.lime} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-ink text-[15px] font-extrabold">{WALL_KINDS.find((k) => k.key === selectedWall.kind)?.label}</Text>
                <Text className="text-ink/40 text-[11px]">
                  {formatMetres(Math.hypot(selectedWall.end.x - selectedWall.start.x, selectedWall.end.y - selectedWall.start.y))} long
                </Text>
              </View>
              <Pressable onPress={() => setSelection(null)} className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="close" size={16} color={brand.inkMuted} />
              </Pressable>
            </View>
            <View>
              <PanelTitle>Type</PanelTitle>
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {WALL_KINDS.map((k) => (
                  <Pressable
                    key={k.key}
                    onPress={() => patchWall(selectedWall.id, { kind: k.key })}
                    className={`px-3 h-9 rounded-lg items-center justify-center border ${selectedWall.kind === k.key ? "bg-ink border-ink" : "border-ink/10 active:bg-ivory"}`}
                  >
                    <Text className={`text-xs font-bold ${selectedWall.kind === k.key ? "text-white" : "text-ink"}`}>{k.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <PanelTitle>Thickness</PanelTitle>
              <Stepper
                value={Math.round((selectedWall.thickness / PX_PER_M) * 100)}
                min={5}
                max={60}
                suffix="cm"
                onChange={(cm) => patchWall(selectedWall.id, { thickness: Math.max(2, Math.round((cm / 100) * PX_PER_M)) })}
              />
            </View>
            <Text className="text-ink/40 text-[11px]">Drag the round handles to change where the wall starts and ends.</Text>
            <Pressable onPress={deleteSelection} className="flex-row items-center justify-center h-10 rounded-lg border border-ink/10 active:bg-red-50">
              <Ionicons name="trash-outline" size={15} color={brand.danger} />
              <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>Delete</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View>
              <PanelTitle>Floor</PanelTitle>
              <TextField
                value={floor.name}
                onChange={(v) => updateFloor((f) => ({ ...f, name: v }))}
                placeholder="e.g. Ground floor"
              />
            </View>
            <View>
              <PanelTitle>Floor size</PanelTitle>
              <View className="flex-row" style={{ gap: 8 }}>
                <MetreField label="W" units={floor.w} min={5} onCommit={(w) => updateFloor((f) => ({ ...f, w }))} />
                <MetreField label="H" units={floor.h} min={5} onCommit={(h) => updateFloor((f) => ({ ...f, h }))} />
              </View>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              {[
                { label: "Areas", value: floor.rooms.filter((r) => r.name).length },
                { label: "Tables", value: floor.items.filter((i) => isTable(i.type)).length },
                { label: "Seats", value: totalSeats },
              ].map((stat) => (
                <View key={stat.label} className="flex-1 bg-ivory rounded-xl p-3">
                  <Text className="text-ink text-lg font-extrabold">{stat.value}</Text>
                  <Text className="text-ink/40 text-[11px]">{stat.label}</Text>
                </View>
              ))}
            </View>
            <View className="bg-ink rounded-xl p-3.5" style={{ gap: 8 }}>
              <Text className="text-lime text-xs font-extrabold">Make it match your place</Text>
              {[
                "Set the floor size to your building in metres.",
                "Draw rooms (Room tool) — walls are added around them.",
                "Use Wall for extra walls; choose Window or Glass for openings.",
                "Add doors, tables and facilities from the left panel.",
                "Place “You are here” where a screen will hang.",
              ].map((tip, i) => (
                <View key={tip} className="flex-row">
                  <Text className="text-lime text-[11px] font-bold w-4">{i + 1}</Text>
                  <Text className="flex-1 text-white/70 text-[11px] leading-4">{tip}</Text>
                </View>
              ))}
            </View>
            {venue.floors.length > 1 && (
              <Pressable
                onPress={async () => {
                  if (!(await confirmAsync("Delete this floor?", `“${floor.name}” and everything on it will be removed.`))) return;
                  const next = { ...venue, floors: venue.floors.filter((f) => f.id !== floor.id) };
                  commit(next);
                  setFloorId(next.floors[0].id);
                }}
                className="flex-row items-center justify-center h-10 rounded-lg border border-ink/10 active:bg-red-50"
              >
                <Ionicons name="trash-outline" size={15} color={brand.danger} />
                <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>Delete floor</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );

  /* ---------- canvas overlay ---------- */

  const selBorder = { borderWidth: 2, borderColor: brand.ink, borderStyle: "dashed" as const };
  const handle = (extra: object) => ({
    position: "absolute" as const,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: brand.lime,
    borderWidth: 2,
    borderColor: brand.ink,
    ...extra,
  });
  const overlayPointer = mode === "select" ? "box-none" : "none";

  const draftLen = draft ? Math.hypot(draft.end.x - draft.start.x, draft.end.y - draft.start.y) : 0;

  return (
    <View className="flex-1 bg-ivory">
      {/* Top bar */}
      <View className="flex-row flex-wrap items-center justify-between px-4 pt-4 pb-3" style={{ gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View>
            <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">Venue map</Text>
            <Text className="text-ink text-xl font-extrabold tracking-tight">Floor designer</Text>
          </View>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1 ml-2">
            {venue.floors.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFloorId(f.id);
                  setSelection(null);
                }}
                className={`px-3 h-8 rounded-lg items-center justify-center ${f.id === floor.id ? "bg-ink" : "active:bg-ivory"}`}
              >
                <Text className={`text-xs font-bold ${f.id === floor.id ? "text-white" : "text-ink/60"}`}>{f.name || "Floor"}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                const f = { ...emptyFloor(`Floor ${venue.floors.length}`), w: floor.w, h: floor.h };
                commit({ ...venue, floors: [...venue.floors, f] });
                setFloorId(f.id);
                setSelection(null);
              }}
              accessibilityLabel="Add floor"
              className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory"
            >
              <Ionicons name="add" size={16} color={brand.ink} />
            </Pressable>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1" style={{ gap: 2 }}>
            <ToolButton icon="hand-left-outline" label="Select" active={mode === "select"} onPress={() => setMode("select")} />
            <ToolButton icon="remove-outline" label="Wall" active={mode === "wall"} onPress={() => { setMode("wall"); setSelection(null); }} />
            <ToolButton icon="square-outline" label="Room" active={mode === "room"} onPress={() => { setMode("room"); setSelection(null); }} />
            {!isWide && <ToolButton icon="add-circle-outline" label="Add" active={libraryOpen} onPress={() => setLibraryOpen((o) => !o)} />}
          </View>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1" style={{ gap: 2 }}>
            <ToolButton icon="arrow-undo-outline" onPress={undo} disabled={!undoStack.current.length} label={undefined} />
            <ToolButton icon="arrow-redo-outline" onPress={redo} disabled={!redoStack.current.length} label={undefined} />
          </View>
          <View className="flex-row items-center bg-white border border-ink/10 rounded-xl p-1" style={{ gap: 2 }}>
            <ToolButton icon="remove" onPress={() => setScale(Math.max(0.2, s / 1.2))} />
            <Text className="text-ink text-xs font-bold w-11 text-center">{Math.round(s * 100)}%</Text>
            <ToolButton icon="add" onPress={() => setScale(Math.min(3, s * 1.2))} />
            <ToolButton icon="scan-outline" onPress={() => setScale(null)} />
          </View>
          <Pressable onPress={() => setTemplatesOpen(true)} className="flex-row items-center h-11 px-3.5 rounded-xl bg-white border border-ink/10 active:bg-ivory">
            <Ionicons name="albums-outline" size={15} color={brand.ink} />
            <Text className="text-ink text-xs font-bold ml-1.5">Templates</Text>
          </Pressable>
          <Pressable onPress={() => { setSelection(null); setPreview(true); }} className="flex-row items-center h-11 px-3.5 rounded-xl bg-lime active:bg-lime-dark">
            <Ionicons name="eye-outline" size={15} color={brand.ink} />
            <Text className="text-ink text-xs font-bold ml-1.5">Preview</Text>
          </Pressable>
          <View className="flex-row items-center ml-1">
            <Ionicons
              name={saveState === "saved" ? "cloud-done-outline" : "cloud-upload-outline"}
              size={15}
              color={brand.inkMuted}
            />
            <Text className="text-ink/50 text-[11px] ml-1">{saveState === "saved" ? "Saved" : "Saving…"}</Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View className="flex-1 flex-row px-4 pb-4" style={{ gap: 12 }}>
        {isWide && library}

        <View className="flex-1 bg-white rounded-2xl border border-ink/5 overflow-hidden">
          {/* tool options */}
          {mode !== "select" && (
            <View className="absolute left-3 top-3 z-10 flex-row flex-wrap items-center bg-white/95 border border-ink/10 rounded-xl p-1.5" style={{ gap: 4, maxWidth: "94%" }}>
              {mode === "wall"
                ? WALL_KINDS.map((k) => (
                    <Pressable
                      key={k.key}
                      onPress={() => setWallKind(k.key)}
                      className={`px-3 h-8 rounded-lg items-center justify-center ${wallKind === k.key ? "bg-ink" : "active:bg-ivory"}`}
                    >
                      <Text className={`text-xs font-bold ${wallKind === k.key ? "text-white" : "text-ink"}`}>{k.label}</Text>
                    </Pressable>
                  ))
                : (Object.keys(MATERIALS) as Material[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setRoomMaterial(m)}
                      className={`flex-row items-center pl-1 pr-2 h-8 rounded-lg ${roomMaterial === m ? "bg-ink" : "active:bg-ivory"}`}
                    >
                      <View className="w-5 h-5 rounded border border-ink/10" style={{ backgroundColor: MATERIALS[m].base }} />
                      <Text className={`text-xs font-bold ml-1 ${roomMaterial === m ? "text-white" : "text-ink"}`}>{MATERIALS[m].name}</Text>
                    </Pressable>
                  ))}
              {mode === "room" && (
                <Pressable onPress={() => setRoomWalls((v) => !v)} className="flex-row items-center px-2 h-8 rounded-lg active:bg-ivory">
                  <Ionicons name={roomWalls ? "checkbox" : "square-outline"} size={16} color={brand.ink} />
                  <Text className="text-ink text-xs font-bold ml-1">Walls around</Text>
                </Pressable>
              )}
              <Text className="text-ink/40 text-[11px] px-2">
                {mode === "wall" ? "Drag to draw · ends snap together" : "Drag a rectangle"}
              </Text>
            </View>
          )}

          <View className="flex-1" onLayout={(e) => setViewport({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <ScrollView
              horizontal
              scrollEnabled={!dragging && mode === "select"}
              onScroll={(e) => (scroll.current.x = e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator
            >
              <ScrollView
                scrollEnabled={!dragging && mode === "select"}
                onScroll={(e) => (scroll.current.y = e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator
              >
                <View style={{ padding: PAD }}>
                  <View
                    style={[
                      { width: floor.w * s, height: floor.h * s },
                      Platform.OS === "web" ? ({ userSelect: "none", cursor: mode === "select" ? "default" : "crosshair" } as any) : null,
                    ]}
                    {...canvasHandlers}
                  >
                    <View pointerEvents="none">
                      <FloorRenderer floor={floor} scale={s} showGrid idPrefix="vme" />
                    </View>

                    {/* hit areas: rooms, walls, items (in that stacking order) */}
                    <View pointerEvents={overlayPointer} style={{ position: "absolute", left: 0, top: 0, width: floor.w * s, height: floor.h * s }}>
                      {floor.rooms.map((r) => {
                        const sel = selection?.kind === "room" && selection.id === r.id;
                        return (
                          <View
                            key={r.id}
                            {...roomHandlers(r)}
                            style={[{ position: "absolute", left: r.x * s, top: r.y * s, width: r.w * s, height: r.h * s }, sel ? selBorder : null]}
                          >
                            {sel && <View {...resizeHandlers("room", r)} style={handle({ right: -9, bottom: -9 })} />}
                          </View>
                        );
                      })}
                      {floor.walls.map((w) => {
                        const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
                        const thick = Math.max(14, w.thickness * s);
                        const sel = selection?.kind === "wall" && selection.id === w.id;
                        return (
                          <View
                            key={w.id}
                            {...wallHandlers(w)}
                            style={{
                              position: "absolute",
                              left: ((w.start.x + w.end.x) / 2) * s - (len * s) / 2,
                              top: ((w.start.y + w.end.y) / 2) * s - thick / 2,
                              width: len * s,
                              height: thick,
                              transform: [{ rotate: `${Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x)}rad` }],
                              backgroundColor: sel ? "rgba(208,230,107,0.45)" : "transparent",
                              borderRadius: 4,
                            }}
                          />
                        );
                      })}
                      {floor.items.map((i) => {
                        const sel = selection?.kind === "item" && selection.id === i.id;
                        return (
                          <View
                            key={i.id}
                            {...itemHandlers(i)}
                            style={[
                              {
                                position: "absolute",
                                left: i.x * s,
                                top: i.y * s,
                                width: Math.max(12, i.w * s),
                                height: Math.max(12, i.h * s),
                                transform: [{ rotate: `${i.rotation}deg` }],
                              },
                              i.type === "label" && !sel ? { borderWidth: 1, borderColor: "rgba(32,40,59,0.25)", borderStyle: "dashed" as const } : null,
                              sel ? selBorder : null,
                            ]}
                          >
                            {sel && <View {...resizeHandlers("item", i)} style={handle({ right: -9, bottom: -9 })} />}
                          </View>
                        );
                      })}
                      {selectedWall &&
                        (["start", "end"] as const).map((which) => (
                          <View
                            key={which}
                            {...endpointHandlers(selectedWall, which)}
                            style={handle({
                              left: selectedWall[which].x * s - 9,
                              top: selectedWall[which].y * s - 9,
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                            })}
                          />
                        ))}
                    </View>

                    {/* drawing preview */}
                    {draft && mode === "wall" && (
                      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                        <View
                          style={{
                            position: "absolute",
                            left: ((draft.start.x + draft.end.x) / 2) * s - (draftLen * s) / 2,
                            top: ((draft.start.y + draft.end.y) / 2) * s - 6 * s,
                            width: draftLen * s,
                            height: Math.max(3, 12 * s),
                            backgroundColor: brand.ink,
                            opacity: 0.6,
                            transform: [{ rotate: `${Math.atan2(draft.end.y - draft.start.y, draft.end.x - draft.start.x)}rad` }],
                          }}
                        />
                        <View style={{ position: "absolute", left: draft.end.x * s + 10, top: draft.end.y * s + 10 }} className="bg-ink rounded-md px-2 py-1">
                          <Text className="text-lime text-[11px] font-bold">{formatMetres(draftLen)}</Text>
                        </View>
                      </View>
                    )}
                    {draft && mode === "room" && (
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: Math.min(draft.start.x, draft.end.x) * s,
                          top: Math.min(draft.start.y, draft.end.y) * s,
                          width: Math.abs(draft.end.x - draft.start.x) * s,
                          height: Math.abs(draft.end.y - draft.start.y) * s,
                          borderWidth: 2,
                          borderColor: brand.ink,
                          borderStyle: "dashed",
                          backgroundColor: MATERIALS[roomMaterial].base + "CC",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View className="bg-ink rounded-md px-2 py-1">
                          <Text className="text-lime text-[11px] font-bold">
                            {formatMetres(Math.abs(draft.end.x - draft.start.x))} × {formatMetres(Math.abs(draft.end.y - draft.start.y))}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </ScrollView>
          </View>

          {/* narrow screens: floating library + properties */}
          {!isWide && libraryOpen && <View className="absolute left-3 top-3 bottom-3 z-20">{library}</View>}
          {!isWide && selection && <View className="absolute right-3 top-3 bottom-3 z-20">{properties}</View>}
        </View>

        {isWide && properties}
      </View>

      {/* Templates */}
      <Modal visible={templatesOpen} transparent animationType="fade" onRequestClose={() => setTemplatesOpen(false)}>
        <View className="flex-1 bg-ink/60 items-center justify-center p-6">
          <View className="bg-white rounded-3xl w-full max-w-4xl max-h-full overflow-hidden">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
              <View className="flex-1">
                <Text className="text-ink text-xl font-extrabold tracking-tight">Start from a layout</Text>
                <Text className="text-ink/50 text-[13px] mt-0.5">
                  Pick the closest match, then move walls, rooms and furniture until it looks exactly like your place.
                </Text>
              </View>
              <Pressable onPress={() => setTemplatesOpen(false)} className="w-9 h-9 rounded-xl items-center justify-center active:bg-ivory">
                <Ionicons name="close" size={20} color={brand.ink} />
              </Pressable>
            </View>
            <TemplateGrid onPick={applyTemplate} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TemplateGrid({ onPick }: { onPick: (key: string) => void }) {
  const previews = useMemo(() => TEMPLATES.map((t) => ({ ...t, venue: t.build() })), []);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 4 }}>
      <View className="flex-row flex-wrap" style={{ gap: 14 }}>
        {previews.map((t) => {
          const f = t.venue.floors[0];
          const sc = 260 / f.w;
          return (
            <Pressable
              key={t.key}
              onPress={() => onPick(t.key)}
              className="rounded-2xl border border-ink/10 overflow-hidden active:bg-ivory"
              style={{ width: 280 }}
            >
              <View className="bg-ivory items-center justify-center" style={{ height: 180, padding: 10 }}>
                {t.key === "blank" ? (
                  <Ionicons name="add-circle-outline" size={40} color={brand.inkDisabled} />
                ) : (
                  <FloorRenderer floor={f} scale={sc} idPrefix={`tpl-${t.key}`} />
                )}
              </View>
              <View className="flex-row items-center p-3.5">
                <View className="w-9 h-9 rounded-xl bg-ink items-center justify-center">
                  <Ionicons name={t.icon as any} size={17} color={brand.lime} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-ink text-[14px] font-extrabold">{t.name}</Text>
                  <Text numberOfLines={1} className="text-ink/50 text-[11px]">
                    {t.description}
                    {t.venue.floors.length > 1 ? ` · ${t.venue.floors.length} floors` : ""}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
