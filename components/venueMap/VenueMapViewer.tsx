// Interactive venue map for staff and visitors:
// 3D/plan views, "You are here", walking routes, tap a table for status & order.
import { brand } from "@/config/theme";
import useOrder from "@/store/Order/Order";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { CATALOG, isTable, LEGEND, type LegendGroup } from "./catalog";
import FloorRenderer from "./FloorRenderer";
import IsoRenderer, { itemHeight, makeProjector, type IsoView } from "./IsoRenderer";
import Venue3D, { canUse3D } from "./three/Venue3D";
import { findNearest, findRoute, type Destination } from "./route";
import useTableState, { TABLE_STATUS, tableStatusOf, type TableStatus } from "./tableState";
import type { Floor, Item, Point, Venue } from "./types";

type Props = {
  venue: Venue | null;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  // Extra controls rendered at the right of the header (e.g. "Edit").
  headerRight?: React.ReactNode;
  idPrefix?: string;
  // Staff can change table status and link orders; visitors only look.
  staff?: boolean;
};

type Target = { id: string; title: string; subtitle: string; floorId: string; cx: number; cy: number };
type RouteState = { floorId: string; points: Point[]; metres: number; to: string };

const RESTROOM_RE = /rest\s?room|toilet|\bwc\b|washroom|bathroom/i;
// Places people commonly ask for, in the order the buttons appear.
const GO_GROUPS: LegendGroup[] = ["pay", "restrooms", "entrances", "bar", "stairs", "info"];

function roomAt(floor: Floor, x: number, y: number) {
  return floor.rooms.find((r) => r.name && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

function buildTargets(venue: Venue): Target[] {
  const out: Target[] = [];
  for (const floor of venue.floors) {
    for (const room of floor.rooms) {
      if (!room.name) continue;
      out.push({
        id: room.id,
        title: room.name,
        subtitle: venue.floors.length > 1 ? `Area · ${floor.name}` : "Area",
        floorId: floor.id,
        cx: room.x + room.w / 2,
        cy: room.y + room.h / 2,
      });
    }
    for (const item of floor.items) {
      if (item.type === "you-are-here" || item.type === "door" || item.type === "door-double") continue;
      const entry = CATALOG[item.type];
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      out.push({
        id: item.id,
        title: item.label || entry.name,
        subtitle: [item.label ? entry.name : null, roomAt(floor, cx, cy)?.name, venue.floors.length > 1 ? floor.name : null]
          .filter(Boolean)
          .join(" · "),
        floorId: floor.id,
        cx,
        cy,
      });
    }
  }
  return out;
}

function groupDestinations(floor: Floor, group: LegendGroup): Destination[] {
  const out: Destination[] = floor.items
    .filter((i) => CATALOG[i.type].legend === group)
    .map((item) => ({ kind: "item" as const, item }));
  const re = group === "restrooms" ? RESTROOM_RE : group === "bar" ? /\bbar\b/i : group === "kitchen" ? /kitchen/i : null;
  if (re) for (const room of floor.rooms) if (re.test(room.name)) out.push({ kind: "room", room });
  if (group === "entrances") {
    // Prefer real exits over the decorative entrance mat when both exist.
    out.sort((a, b) => (a.kind === "item" && a.item.type === "exit" ? -1 : 0) - (b.kind === "item" && b.item.type === "exit" ? -1 : 0));
  }
  return out;
}

function groupIds(floor: Floor, group: LegendGroup) {
  const ids = new Set<string>();
  for (const d of groupDestinations(floor, group)) ids.add(d.kind === "item" ? d.item.id : d.room.id);
  if (group === "restrooms") for (const item of floor.items) if (item.type === "wc" || item.type === "sink") ids.add(item.id);
  return ids;
}

function Pulse({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
      }}
    />
  );
}

const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const walkTime = (m: number) => {
  const s = Math.max(5, Math.round(m / 1.2 / 5) * 5);
  return s < 60 ? `${s} s walk` : `${Math.round(s / 60)} min walk`;
};

export default function VenueMapViewer({
  venue,
  loading,
  title = "Floor map",
  subtitle,
  headerRight,
  idPrefix = "vmv",
  staff = true,
}: Props) {
  const { width } = useWindowDimensions();
  const [floorId, setFloorId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<{ ids: Set<string>; label: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dim, setDim] = useState<"3d" | "2d">("3d");
  const [view, setView] = useState<IsoView>(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [myPos, setMyPos] = useState<{ floorId: string; x: number; y: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Real 3D engine when available; the illustrated 3D is the fallback.
  const [real3d, setReal3d] = useState(() => canUse3D());
  const [camFocus, setCamFocus] = useState<Point | null>(null);
  const hScroll = useRef<ScrollView>(null);
  const vScroll = useRef<ScrollView>(null);

  const { tables, load: loadTables, setStatus, linkOrder } = useTableState();
  const { orders, fetchOrders } = useOrder();

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (staff && selectedId) fetchOrders().catch(() => {});
  }, [selectedId, staff]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const floor = venue?.floors.find((f) => f.id === floorId) ?? venue?.floors[0] ?? null;
  const targets = useMemo(() => (venue ? buildTargets(venue) : []), [venue]);

  useEffect(() => {
    setFocus(null);
  }, [floor?.id]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return targets.filter((t) => t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q)).slice(0, 8);
  }, [query, targets]);

  const legend = useMemo(() => {
    if (!floor) return [];
    return (Object.keys(LEGEND) as LegendGroup[]).map((g) => ({ group: g, ids: groupIds(floor, g) })).filter((g) => g.ids.size > 0);
  }, [floor]);

  const allTables = useMemo(
    () => (venue ? venue.floors.flatMap((f) => f.items.filter((i) => isTable(i.type) && i.label).map((i) => ({ item: i, floorId: f.id }))) : []),
    [venue],
  );

  if (loading || !venue || !floor) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory p-6">
        {loading ? (
          <Text className="text-ink/40 text-xs">Loading floor map...</Text>
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              <Ionicons name="map-outline" size={26} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">No floor map yet</Text>
            <Text className="text-ink/40 text-xs mt-1 text-center">The owner can design one under Map in the owner console.</Text>
          </>
        )}
      </View>
    );
  }

  /* ---------- geometry shared by 3D and plan ---------- */
  const useReal = dim === "3d" && real3d;
  const iso = dim === "3d" && !real3d ? makeProjector(floor, view) : null;
  const contentW = iso ? iso.size.w : floor.w;
  const contentH = iso ? iso.size.h : floor.h;
  const fitFor = (w: number, h: number) => (box.w && box.h ? Math.min(box.w / w, box.h / h) * 0.96 : 0.5);
  const scale = fitFor(contentW, contentH) * zoom;
  const mapW = contentW * scale;
  const mapH = contentH * scale;
  const offX = Math.max(0, (box.w - mapW) / 2);
  const offY = Math.max(0, (box.h - mapH) / 2);
  const toScreen = (x: number, y: number, z = 0) => {
    if (!iso) return { x: x * scale, y: y * scale };
    const q = iso.project({ x, y }, z);
    return { x: q.x * scale, y: q.y * scale };
  };
  const fromScreen = (sx: number, sy: number): Point => (iso ? iso.unproject(sx / scale, sy / scale) : { x: sx / scale, y: sy / scale });
  const isWide = width >= 980;

  const placedYah = floor.items.find((i) => i.type === "you-are-here");
  const here: Point | null =
    myPos && myPos.floorId === floor.id
      ? { x: myPos.x, y: myPos.y }
      : placedYah
        ? { x: placedYah.x + placedYah.w / 2, y: placedYah.y + placedYah.h / 2 }
        : null;
  const hereScreen = here ? toScreen(here.x, here.y, iso ? 50 : 0) : null;
  // A position set by the person replaces the fixed pin, so only one shows.
  const shownFloor = myPos && myPos.floorId === floor.id ? { ...floor, items: floor.items.filter((i) => i.type !== "you-are-here") } : floor;

  const selected = floor.items.find((i) => i.id === selectedId) ?? null;
  const tagColors = Object.fromEntries(
    floor.items
      .filter((i) => isTable(i.type))
      .map((i) => {
        const st = TABLE_STATUS[tableStatusOf(tables, i.id)];
        return [i.id, { bg: st.color, fg: st.text }];
      }),
  );
  const statusCounts = (Object.keys(TABLE_STATUS) as TableStatus[]).map((s) => ({
    status: s,
    count: floor.items.filter((i) => isTable(i.type) && tableStatusOf(tables, i.id) === s).length,
  }));

  const focusPoints = focus
    ? [
        ...floor.items
          .filter((i) => focus.ids.has(i.id))
          .map((i) => ({ id: i.id, ...toScreen(i.x + i.w / 2, i.y + i.h / 2, iso ? itemHeight(i) / 2 : 0), s: Math.max(i.w, i.h) })),
        ...floor.rooms
          .filter((r) => focus.ids.has(r.id))
          .map((r) => ({ id: r.id, ...toScreen(r.x + r.w / 2, iso ? r.y + r.h / 2 : r.y + 30), s: 60 })),
      ].slice(0, 30)
    : [];

  // Things you can tap on the map.
  const tappable = floor.items.filter((i) => isTable(i.type) || (CATALOG[i.type].legend && i.type !== "you-are-here"));

  /* ---------- actions ---------- */
  const centerOn = (f: Floor, x: number, y: number, z: number, newZoom: number) => {
    const p3 = dim === "3d" ? makeProjector(f, view) : null;
    const s = fitFor(p3 ? p3.size.w : f.w, p3 ? p3.size.h : f.h) * newZoom;
    const q = p3 ? p3.project({ x, y }, z) : { x, y };
    const ox = Math.max(0, (box.w - (p3 ? p3.size.w : f.w) * s) / 2);
    const oy = Math.max(0, (box.h - (p3 ? p3.size.h : f.h) * s) / 2);
    setTimeout(() => {
      hScroll.current?.scrollTo({ x: Math.max(0, ox + q.x * s - box.w / 2), animated: true });
      vScroll.current?.scrollTo({ y: Math.max(0, oy + q.y * s - box.h / 2), animated: true });
    }, 60);
  };

  const selectItem = (item: Item, f: Floor = floor) => {
    setFloorId(f.id);
    setSelectedId(item.id);
    setLinking(false);
    setFindOpen(false);
    const z = Math.max(zoom, 1.7);
    setZoom(z);
    setCamFocus({ x: item.x + item.w / 2, y: item.y + item.h / 2 });
    if (!useReal) centerOn(f, item.x + item.w / 2, item.y + item.h / 2, 30, z);
  };

  // A tap on the 3D floor: set position while picking, otherwise pick the nearest thing.
  const onTapPoint = (p: Point) => {
    if (picking) {
      if (p.x >= 0 && p.y >= 0 && p.x <= floor.w && p.y <= floor.h) {
        setMyPos({ floorId: floor.id, x: p.x, y: p.y });
        setRoute(null);
      }
      setPicking(false);
      return;
    }
    let best: Item | null = null;
    let bestD = Infinity;
    for (const i of tappable) {
      const d = Math.hypot(i.x + i.w / 2 - p.x, i.y + i.h / 2 - p.y);
      if (d < Math.max(i.w, i.h) / 2 + 24 && d < bestD) {
        best = i;
        bestD = d;
      }
    }
    if (best) selectItem(best);
    else setSelectedId(null);
  };

  const showRoute = (dest: Destination, label: string) => {
    if (!here) {
      setNotice("Set where you are first — tap “I’m here” and then your spot on the map.");
      return;
    }
    const r = findRoute(floor, here, dest);
    if (!r) {
      setNotice(`No walkable path found to ${label}.`);
      return;
    }
    setRoute({ floorId: floor.id, points: r.points, metres: r.metres, to: label });
    setZoom(1);
    setCamFocus(null);
  };

  const goToGroup = (group: LegendGroup) => {
    if (!here) {
      setFocus({ ids: groupIds(floor, group), label: LEGEND[group].label });
      setNotice("Set where you are to get directions. Showing all of them for now.");
      return;
    }
    const best = findNearest(floor, here, groupDestinations(floor, group));
    if (!best) {
      setNotice(`No ${LEGEND[group].label.toLowerCase()} reachable on this floor.`);
      return;
    }
    const d = best.dest;
    const label = d.kind === "item" ? d.item.label || CATALOG[d.item.type].name : d.room.name;
    setRoute({ floorId: floor.id, points: best.route.points, metres: best.route.metres, to: label });
    setFocus({ ids: new Set([d.kind === "item" ? d.item.id : d.room.id]), label });
    setSelectedId(null);
    setZoom(1);
    setCamFocus(null);
  };

  const goToTarget = (t: Target) => {
    setQuery("");
    const f = venue.floors.find((fl) => fl.id === t.floorId) ?? floor;
    const item = f.items.find((i) => i.id === t.id);
    if (item) {
      selectItem(item, f);
      return;
    }
    setFloorId(t.floorId);
    setFocus({ ids: new Set([t.id]), label: t.title });
    setCamFocus({ x: t.cx, y: t.cy });
    if (!useReal) centerOn(f, t.cx, t.cy, 0, zoom);
  };

  /* ---------- pieces ---------- */
  const routeScreen = route && route.floorId === floor.id ? route.points.map((p) => toScreen(p.x, p.y, 1)) : null;

  const searchBox = (
    <View>
      <View className="flex-row items-center bg-white border border-ink/10 rounded-xl px-3 h-11">
        <Ionicons name="search" size={17} color={brand.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a table, room or facility"
          placeholderTextColor={brand.inkDisabled}
          className="flex-1 ml-2 text-[14px] text-ink"
          style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={17} color={brand.inkDisabled} />
          </Pressable>
        )}
      </View>
      {query.trim().length > 0 && (
        <View className="bg-white border border-ink/10 rounded-xl mt-1.5 overflow-hidden">
          {results.length === 0 ? (
            <Text className="text-ink/40 text-xs px-3 py-3">Nothing called “{query}”.</Text>
          ) : (
            results.map((r) => (
              <Pressable key={r.id} onPress={() => goToTarget(r)} className="flex-row items-center px-3 py-2.5 border-b border-ink/5 active:bg-ivory">
                <Ionicons name="location-outline" size={16} color={brand.ink} />
                <View className="flex-1 ml-2.5">
                  <Text numberOfLines={1} className="text-ink text-[13px] font-bold">{r.title}</Text>
                  {!!r.subtitle && <Text numberOfLines={1} className="text-ink/40 text-[11px]">{r.subtitle}</Text>}
                </View>
                <Ionicons name="arrow-forward" size={14} color={brand.inkDisabled} />
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );

  const goButtons = (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      {allTables.length > 0 && (
        <Pressable
          onPress={() => setFindOpen((o) => !o)}
          className={`flex-row items-center rounded-xl px-3 h-10 border ${findOpen ? "bg-ink border-ink" : "bg-lime border-lime active:bg-lime-dark"}`}
        >
          <Ionicons name="restaurant" size={15} color={findOpen ? brand.lime : brand.ink} />
          <Text className={`text-[13px] font-bold ml-1.5 ${findOpen ? "text-white" : "text-ink"}`}>Find table</Text>
        </Pressable>
      )}
      {GO_GROUPS.filter((g) => legend.some((l) => l.group === g)).map((g) => (
        <Pressable
          key={g}
          onPress={() => goToGroup(g)}
          className="flex-row items-center rounded-xl px-3 h-10 bg-white border border-ink/10 active:bg-ivory"
        >
          <Ionicons name={LEGEND[g].icon as any} size={15} color={brand.ink} />
          <Text className="text-ink text-[13px] font-semibold ml-1.5">{LEGEND[g].label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const statusKey = (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      {statusCounts.map(({ status, count }) => (
        <View key={status} className="flex-row items-center bg-white border border-ink/10 rounded-full pl-1.5 pr-2.5 py-1">
          <View className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: TABLE_STATUS[status].color }} />
          <Text className="text-ink text-[11px] font-semibold ml-1.5">{TABLE_STATUS[status].label}</Text>
          <Text className="text-ink/40 text-[11px] font-bold ml-1">{count}</Text>
        </View>
      ))}
    </View>
  );

  const selectedInfo = selected ? tables[selected.id] : undefined;
  const selectedStatus = selected ? tableStatusOf(tables, selected.id) : "available";
  const linkedOrder = selectedInfo?.orderId ? orders.find((o) => o.id === selectedInfo.orderId) : undefined;
  const linkedElsewhere = new Set(Object.entries(tables).filter(([id, t]) => t.orderId && id !== selected?.id).map(([, t]) => t.orderId));
  const openOrders = orders
    .filter((o) => !/cancel|paid|complete/i.test(o.status) && !linkedElsewhere.has(o.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const card = selected && (
    <View className="bg-white rounded-2xl border border-ink/10 overflow-hidden" style={{ width: 320, maxWidth: "100%" }}>
      <View className="flex-row items-center p-4 bg-ink">
        <View
          className="min-w-[52px] h-[52px] px-2 rounded-2xl items-center justify-center"
          style={{ backgroundColor: isTable(selected.type) ? TABLE_STATUS[selectedStatus].color : brand.lime }}
        >
          <Text
            className="text-lg font-extrabold"
            style={{ color: isTable(selected.type) ? TABLE_STATUS[selectedStatus].text : brand.ink }}
          >
            {selected.label || "•"}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-white text-base font-extrabold">{CATALOG[selected.type].name}</Text>
          <Text className="text-white/50 text-xs">
            {[roomAt(floor, selected.x + selected.w / 2, selected.y + selected.h / 2)?.name, selected.seats ? `${selected.seats} seats` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <Pressable onPress={() => setSelectedId(null)} accessibilityLabel="Close" className="w-8 h-8 rounded-lg items-center justify-center active:bg-white/10">
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <View className="p-4" style={{ gap: 14 }}>
        {isTable(selected.type) && (
          <>
            <View>
              <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mb-2">Status</Text>
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {(Object.keys(TABLE_STATUS) as TableStatus[]).map((s) => {
                  const active = selectedStatus === s;
                  return (
                    <Pressable
                      key={s}
                      disabled={!staff}
                      onPress={() => setStatus(selected.id, s)}
                      className={`flex-row items-center rounded-lg px-2.5 h-9 border ${active ? "border-ink" : "border-ink/10"} ${staff && !active ? "active:bg-ivory" : ""}`}
                      style={active ? { backgroundColor: TABLE_STATUS[s].color } : undefined}
                    >
                      <Ionicons name={TABLE_STATUS[s].icon as any} size={13} color={active ? TABLE_STATUS[s].text : TABLE_STATUS[s].color} />
                      <Text className="text-xs font-bold ml-1" style={{ color: active ? TABLE_STATUS[s].text : brand.ink }}>
                        {TABLE_STATUS[s].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedInfo && selectedStatus !== "available" && (
                <Text className="text-ink/40 text-[11px] mt-1.5">
                  {TABLE_STATUS[selectedStatus].label} for {minutesSince(selectedInfo.since)} min
                </Text>
              )}
            </View>

            {staff && (
              <View>
                <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mb-2">Order</Text>
                {selectedInfo?.orderId ? (
                  <View className="bg-ivory rounded-xl p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-ink text-[13px] font-extrabold">#{selectedInfo.orderId.split("-")[0].toUpperCase()}</Text>
                      <Text className="text-ink text-[13px] font-extrabold">
                        {linkedOrder ? `${Number(linkedOrder.total || 0).toLocaleString()} RWF` : "—"}
                      </Text>
                    </View>
                    {linkedOrder ? (
                      <Text className="text-ink/50 text-[11px] mt-0.5">
                        {linkedOrder.items?.reduce((n, it) => n + (it.quantity || 0), 0) ?? 0} items · {linkedOrder.status}
                      </Text>
                    ) : (
                      <Text className="text-ink/40 text-[11px] mt-0.5">Loading order…</Text>
                    )}
                    {linkedOrder?.items?.slice(0, 4).map((it) => (
                      <View key={it.id} className="flex-row justify-between mt-1.5">
                        <Text numberOfLines={1} className="flex-1 text-ink/70 text-[12px] pr-2">
                          {it.quantity} × {it.product?.name ?? "Item"}
                        </Text>
                        <Text className="text-ink/70 text-[12px]">{Number(it.totalPrice || 0).toLocaleString()}</Text>
                      </View>
                    ))}
                    <Pressable onPress={() => linkOrder(selected.id, undefined)} className="mt-2.5 self-start">
                      <Text className="text-ink/50 text-[11px] font-bold underline">Unlink order</Text>
                    </Pressable>
                  </View>
                ) : linking ? (
                  <View className="bg-ivory rounded-xl overflow-hidden">
                    {openOrders.length === 0 ? (
                      <Text className="text-ink/40 text-xs p-3">No open orders right now.</Text>
                    ) : (
                      openOrders.map((o) => (
                        <Pressable
                          key={o.id}
                          onPress={() => {
                            linkOrder(selected.id, o.id);
                            setLinking(false);
                          }}
                          className="flex-row items-center justify-between px-3 py-2.5 border-b border-ink/5 active:bg-lime/30"
                        >
                          <View>
                            <Text className="text-ink text-[12px] font-bold">#{o.id.split("-")[0].toUpperCase()}</Text>
                            <Text className="text-ink/40 text-[11px]">{minutesSince(o.createdAt)} min ago · {o.status}</Text>
                          </View>
                          <Text className="text-ink text-[12px] font-extrabold">{Number(o.total || 0).toLocaleString()} RWF</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : (
                  <Pressable onPress={() => setLinking(true)} className="flex-row items-center justify-center h-10 rounded-xl border border-dashed border-ink/20 active:bg-ivory">
                    <Ionicons name="link-outline" size={15} color={brand.ink} />
                    <Text className="text-ink text-xs font-bold ml-1.5">Link an open order</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}

        <Pressable
          onPress={() => showRoute({ kind: "item", item: selected }, selected.label || CATALOG[selected.type].name)}
          className="flex-row items-center justify-center h-11 rounded-xl bg-lime active:bg-lime-dark"
        >
          <Ionicons name="navigate" size={16} color={brand.ink} />
          <Text className="text-ink text-[13px] font-bold ml-1.5">Show me the way</Text>
        </Pressable>
      </View>
    </View>
  );

  const findPanel = findOpen && (
    <View className="bg-white rounded-2xl border border-ink/10 p-4" style={{ width: 320, maxWidth: "100%", gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-ink text-[15px] font-extrabold">Find a table</Text>
        <Pressable onPress={() => setFindOpen(false)} className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
          <Ionicons name="close" size={16} color={brand.ink} />
        </Pressable>
      </View>
      {statusKey}
      <ScrollView style={{ maxHeight: 260 }}>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {allTables.map(({ item, floorId: fid }) => {
            const st = TABLE_STATUS[tableStatusOf(tables, item.id)];
            return (
              <Pressable
                key={item.id}
                onPress={() => selectItem(item, venue.floors.find((f) => f.id === fid) ?? floor)}
                className="w-[56px] h-11 rounded-xl items-center justify-center border border-ink/10"
                style={{ backgroundColor: st.color }}
              >
                <Text className="text-[13px] font-extrabold" style={{ color: st.text }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-ivory">
      {/* Header */}
      <View className="flex-row flex-wrap items-center justify-between px-5 pt-5 pb-3" style={{ gap: 12 }}>
        <View>
          <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">Venue map</Text>
          <Text className="text-ink text-2xl font-extrabold tracking-tight">{title}</Text>
          {subtitle && <Text className="text-ink/50 text-[13px]">{subtitle}</Text>}
        </View>
        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
            {(["3d", "2d"] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDim(d);
                  setZoom(1);
                }}
                accessibilityState={{ selected: dim === d }}
                className={`flex-row items-center px-3 h-8 rounded-lg ${dim === d ? "bg-ink" : "active:bg-ivory"}`}
              >
                <Ionicons name={d === "3d" ? "cube-outline" : "map-outline"} size={14} color={dim === d ? brand.lime : brand.inkMuted} />
                <Text className={`text-xs font-bold ml-1.5 ${dim === d ? "text-white" : "text-ink/60"}`}>{d === "3d" ? "3D" : "Plan"}</Text>
              </Pressable>
            ))}
          </View>
          {dim === "3d" && (
            <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
              <Pressable onPress={() => setView((v) => ((v + 3) % 4) as IsoView)} accessibilityLabel="Rotate left" className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="arrow-undo-outline" size={16} color={brand.ink} />
              </Pressable>
              <Pressable onPress={() => setView((v) => ((v + 1) % 4) as IsoView)} accessibilityLabel="Rotate right" className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="arrow-redo-outline" size={16} color={brand.ink} />
              </Pressable>
            </View>
          )}
          {venue.floors.length > 1 && (
            <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
              {venue.floors.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setFloorId(f.id);
                    setSelectedId(null);
                  }}
                  className={`px-3 h-8 rounded-lg items-center justify-center ${f.id === floor.id ? "bg-ink" : "active:bg-ivory"}`}
                >
                  <Text className={`text-xs font-bold ${f.id === floor.id ? "text-white" : "text-ink/60"}`}>{f.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {headerRight}
        </View>
      </View>

      {/* Take me to */}
      <View className="px-5 pb-3" style={{ gap: 10, zIndex: 10 }}>
        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mr-1">Take me to</Text>
          {goButtons}
        </View>
        {!isWide && searchBox}
      </View>

      <View className={`flex-1 ${isWide ? "flex-row" : ""} px-5 pb-5`} style={{ gap: 16 }}>
        {/* Map */}
        <View
          className="flex-1 bg-white rounded-2xl border border-ink/5 overflow-hidden"
          onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {box.w > 0 && useReal && (
            <Venue3D
              floor={shownFloor}
              width={box.w}
              height={box.h}
              view={view}
              zoom={zoom}
              focusPoint={camFocus}
              tagColors={tagColors}
              selectedId={selectedId}
              focusIds={focus?.ids ?? null}
              here={here}
              route={route && route.floorId === floor.id ? route.points : null}
              picking={picking}
              onTapPoint={onTapPoint}
              onSelectItem={(i) => selectItem(i)}
              onFail={() => setReal3d(false)}
            />
          )}
          {box.w > 0 && !useReal && (
            <ScrollView ref={hScroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: box.w }}>
              <ScrollView ref={vScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ minHeight: box.h }}>
                <View style={{ width: Math.max(box.w, mapW), height: Math.max(box.h, mapH) }}>
                  <View style={{ position: "absolute", left: offX, top: offY, width: mapW, height: mapH }}>
                    {iso ? (
                      <IsoRenderer
                        floor={shownFloor}
                        scale={scale}
                        view={view}
                        focusIds={focus?.ids ?? null}
                        idPrefix={`${idPrefix}3d`}
                        tagColors={tagColors}
                        selectedId={selectedId}
                      />
                    ) : (
                      <FloorRenderer floor={shownFloor} scale={scale} focusIds={focus?.ids ?? null} showCompass idPrefix={idPrefix} tagColors={tagColors} />
                    )}

                    {/* Walking route */}
                    {routeScreen && routeScreen.length > 1 && (
                      <Svg pointerEvents="none" width={mapW} height={mapH} style={{ position: "absolute", left: 0, top: 0 }}>
                        <Polyline points={routeScreen.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={brand.ink} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                        <Polyline points={routeScreen.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={brand.lime} strokeWidth={4} strokeDasharray="10 8" strokeLinejoin="round" strokeLinecap="round" />
                        <Circle cx={routeScreen[0].x} cy={routeScreen[0].y} r={7} fill={brand.ink} stroke={brand.lime} strokeWidth={3} />
                        <Circle cx={routeScreen[routeScreen.length - 1].x} cy={routeScreen[routeScreen.length - 1].y} r={9} fill={brand.lime} stroke={brand.ink} strokeWidth={3} />
                      </Svg>
                    )}

                    {focusPoints.map((p) => (
                      <Pulse key={p.id} x={p.x} y={p.y} size={Math.max(40, p.s * scale * 1.2)} color={brand.ink} />
                    ))}

                    {/* Tap targets for tables and facilities */}
                    {!picking &&
                      tappable.map((i) => {
                        const c = toScreen(i.x + i.w / 2, i.y + i.h / 2, iso ? Math.min(30, itemHeight(i)) : 0);
                        const size = Math.max(34, Math.min(i.w, i.h) * scale);
                        return (
                          <Pressable
                            key={i.id}
                            onPress={() => selectItem(i)}
                            accessibilityRole="button"
                            accessibilityLabel={`${i.label || CATALOG[i.type].name}`}
                            style={{
                              position: "absolute",
                              left: c.x - size / 2,
                              top: c.y - size / 2,
                              width: size,
                              height: size,
                              borderRadius: size / 2,
                              borderWidth: selectedId === i.id ? 3 : 0,
                              borderColor: brand.ink,
                            }}
                          />
                        );
                      })}

                    {/* You are here */}
                    {hereScreen && (
                      <>
                        <Pulse x={hereScreen.x} y={hereScreen.y + (iso ? 40 * scale : 0)} size={Math.max(44, 50 * scale)} color={brand.limeDark} />
                        {myPos && myPos.floorId === floor.id && (
                          <View
                            pointerEvents="none"
                            style={{
                              position: "absolute",
                              left: hereScreen.x - 9,
                              top: hereScreen.y + (iso ? 40 * scale : 0) - 9,
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: brand.ink,
                              borderWidth: 4,
                              borderColor: brand.lime,
                            }}
                          />
                        )}
                        <View pointerEvents="none" style={{ position: "absolute", left: hereScreen.x - 50, top: hereScreen.y - 36, width: 100, alignItems: "center" }}>
                          <View className="bg-ink rounded-full px-2.5 py-1 flex-row items-center">
                            <Ionicons name="person" size={11} color={brand.lime} />
                            <Text className="text-lime text-[11px] font-extrabold ml-1">You are here</Text>
                          </View>
                          <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: brand.ink }} />
                        </View>
                      </>
                    )}

                    {/* Tap anywhere to set your position */}
                    {picking && (
                      <Pressable
                        onPress={(e) => {
                          const p = fromScreen(e.nativeEvent.locationX, e.nativeEvent.locationY);
                          if (p.x >= 0 && p.y >= 0 && p.x <= floor.w && p.y <= floor.h) {
                            setMyPos({ floorId: floor.id, x: p.x, y: p.y });
                            setRoute(null);
                          }
                          setPicking(false);
                        }}
                        style={{ position: "absolute", left: 0, top: 0, width: mapW, height: mapH, backgroundColor: "rgba(208,230,107,0.12)" }}
                      />
                    )}
                  </View>
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {/* Top-left: route summary / picking hint / notice */}
          <View pointerEvents="box-none" className="absolute left-3 top-3 right-16" style={{ gap: 8 }}>
            {picking && (
              <View className="self-start flex-row items-center bg-ink rounded-full pl-3 pr-2 py-2">
                <Ionicons name="finger-print" size={14} color={brand.lime} />
                <Text className="text-white text-xs font-bold ml-1.5">Tap the spot where you are standing</Text>
                <Pressable onPress={() => setPicking(false)} className="ml-2">
                  <Ionicons name="close" size={14} color={brand.lime} />
                </Pressable>
              </View>
            )}
            {route && route.floorId === floor.id && !picking && (
              <View className="self-start flex-row items-center bg-ink rounded-2xl pl-3 pr-2 py-2">
                <Ionicons name="walk" size={16} color={brand.lime} />
                <View className="ml-2">
                  <Text className="text-white text-[13px] font-extrabold">To {route.to}</Text>
                  <Text className="text-white/60 text-[11px]">
                    {Math.round(route.metres)} m · about {walkTime(route.metres)}
                  </Text>
                </View>
                <Pressable onPress={() => { setRoute(null); setFocus(null); }} accessibilityLabel="Clear route" className="ml-3 w-7 h-7 rounded-lg items-center justify-center active:bg-white/10">
                  <Ionicons name="close" size={15} color={brand.lime} />
                </Pressable>
              </View>
            )}
            {focus && !route && (
              <Pressable onPress={() => setFocus(null)} className="self-start flex-row items-center bg-ink rounded-full pl-3 pr-2 py-1.5">
                <Text className="text-white text-xs font-bold">Showing: {focus.label}</Text>
                <Ionicons name="close" size={14} color={brand.lime} style={{ marginLeft: 6 }} />
              </Pressable>
            )}
            {notice && (
              <View className="self-start bg-white border border-ink/10 rounded-xl px-3 py-2">
                <Text className="text-ink text-xs">{notice}</Text>
              </View>
            )}
          </View>

          {/* Bottom-left: selected thing or table finder */}
          <View pointerEvents="box-none" className="absolute left-3 bottom-3" style={{ maxWidth: "92%" }}>
            {card || findPanel}
          </View>

          {/* Right: I'm here + zoom */}
          <View className="absolute right-3 bottom-3" style={{ gap: 8 }}>
            <Pressable
              onPress={() => {
                setPicking((p) => !p);
                setSelectedId(null);
              }}
              accessibilityLabel="Set my location"
              className={`w-10 h-10 rounded-xl items-center justify-center border ${picking ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
            >
              <Ionicons name="locate" size={18} color={picking ? brand.lime : brand.ink} />
            </Pressable>
            <View className="bg-white rounded-xl border border-ink/10 overflow-hidden">
              {[
                { icon: "add", on: () => setZoom((z) => Math.min(4, z * 1.25)), label: "Zoom in" },
                { icon: "remove", on: () => setZoom((z) => Math.max(0.5, z / 1.25)), label: "Zoom out" },
                { icon: "scan-outline", on: () => { setZoom(1); setCamFocus(null); }, label: "Fit to screen" },
              ].map((b, i) => (
                <Pressable key={b.label} onPress={b.on} accessibilityLabel={b.label} className={`w-10 h-10 items-center justify-center active:bg-ivory ${i > 0 ? "border-t border-ink/10" : ""}`}>
                  <Ionicons name={b.icon as any} size={18} color={brand.ink} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Side panel */}
        {isWide && (
          <ScrollView style={{ width: 290, flexGrow: 0 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
            {searchBox}
            <Pressable
              onPress={() => {
                setPicking(true);
                setSelectedId(null);
              }}
              className="flex-row items-center bg-ink rounded-xl px-3 py-3 active:bg-ink-soft"
            >
              <View className="w-8 h-8 rounded-lg bg-lime items-center justify-center">
                <Ionicons name="locate" size={16} color={brand.ink} />
              </View>
              <View className="flex-1 ml-2.5">
                <Text className="text-white text-[13px] font-bold">{myPos ? "Move my location" : "I’m here"}</Text>
                <Text className="text-white/50 text-[11px]">
                  {here ? "Tap to change where you are" : "Tap, then touch your spot on the map"}
                </Text>
              </View>
            </Pressable>
            {allTables.length > 0 && (
              <View>
                <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mb-2">Tables on this floor</Text>
                {statusKey}
              </View>
            )}
            {legend.length > 0 && (
              <View>
                <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mb-2">Show on map</Text>
                <View style={{ gap: 6 }}>
                  {legend.map(({ group, ids }) => {
                    const active = focus?.label === LEGEND[group].label;
                    return (
                      <Pressable
                        key={group}
                        onPress={() => setFocus(active ? null : { ids, label: LEGEND[group].label })}
                        className={`flex-row items-center rounded-xl px-3 py-2.5 border ${active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
                      >
                        <Ionicons name={LEGEND[group].icon as any} size={16} color={active ? brand.lime : brand.ink} />
                        <Text className={`flex-1 text-[13px] font-semibold ml-2.5 ${active ? "text-white" : "text-ink"}`}>{LEGEND[group].label}</Text>
                        <Text className={`text-xs font-extrabold ml-2 ${active ? "text-lime" : "text-ink/40"}`}>{ids.size}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <Text className="text-ink/40 text-[11px] leading-4">
              Tip: touch any table to see its number, status and order. Your position isn’t detected automatically — use “I’m here”.
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
