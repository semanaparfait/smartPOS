// Ready-made starting layouts. Authored in metres, converted to world units.
import { CATALOG } from "./catalog";
import {
  PX_PER_M,
  uid,
  type Floor,
  type Item,
  type ItemType,
  type Material,
  type Room,
  type Venue,
  type Wall,
  type WallKind,
} from "./types";

const u = (metresValue: number) => Math.round(metresValue * PX_PER_M);
// Table numbers read like T01, T02...
const num = (prefix: string, n: number) => `${prefix}${String(n).padStart(2, "0")}`;
const EXT = 14;
const INT = 10;

const room = (name: string, x: number, y: number, w: number, h: number, material: Material): Room => ({
  id: uid(),
  name,
  x: u(x),
  y: u(y),
  w: u(w),
  h: u(h),
  material,
});

const seg = (x1: number, y1: number, x2: number, y2: number, kind: WallKind = "wall", t = INT): Wall => ({
  id: uid(),
  start: { x: u(x1), y: u(y1) },
  end: { x: u(x2), y: u(y2) },
  thickness: t,
  kind,
});

// A straight wall with openings; gaps are [from, to] in metres along the wall.
const run = (
  axis: "h" | "v",
  pos: number,
  from: number,
  to: number,
  gaps: [number, number][] = [],
  kind: WallKind = "wall",
  t = INT,
): Wall[] => {
  const pieces: Wall[] = [];
  let cursor = from;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cursor) pieces.push(axis === "h" ? seg(cursor, pos, a, pos, kind, t) : seg(pos, cursor, pos, a, kind, t));
    cursor = b;
  }
  if (cursor < to) pieces.push(axis === "h" ? seg(cursor, pos, to, pos, kind, t) : seg(pos, cursor, pos, to, kind, t));
  return pieces;
};

type ItemOpts = { w?: number; h?: number; rotation?: number; label?: string; seats?: number };

// Item by centre point in metres; w/h overrides in metres.
const at = (type: ItemType, cx: number, cy: number, opts: ItemOpts = {}): Item => {
  const w = opts.w !== undefined ? u(opts.w) : CATALOG[type].w;
  const h = opts.h !== undefined ? u(opts.h) : CATALOG[type].h;
  return {
    id: uid(),
    type,
    x: u(cx) - w / 2,
    y: u(cy) - h / 2,
    w,
    h,
    rotation: opts.rotation ?? 0,
    label: opts.label ?? CATALOG[type].defaultLabel,
    seats: opts.seats ?? CATALOG[type].seats,
  };
};

// A door sitting in a wall. `swing` is the side it opens towards.
const door = (
  type: "door" | "door-double",
  axis: "h" | "v",
  along: number,
  wallPos: number,
  swing: "up" | "down" | "left" | "right",
  width = type === "door" ? 1 : 2,
): Item => {
  const w = u(width);
  const h = type === "door" ? w : w / 2;
  let cx: number;
  let cy: number;
  let rotation = 0;
  if (axis === "h") {
    cx = u(along);
    cy = swing === "down" ? u(wallPos) + h / 2 : u(wallPos) - h / 2;
    rotation = swing === "down" ? 0 : 180;
  } else {
    cy = u(along);
    cx = swing === "right" ? u(wallPos) + h / 2 : u(wallPos) - h / 2;
    rotation = swing === "right" ? -90 : 90;
  }
  return { id: uid(), type, x: cx - w / 2, y: cy - h / 2, w, h, rotation };
};

const floor = (name: string, wM: number, hM: number, rooms: Room[], walls: Wall[], items: Item[]): Floor => ({
  id: uid(),
  name,
  w: u(wM),
  h: u(hM),
  rooms,
  walls,
  items,
});

function restaurant(): Venue {
  let t = 0;
  const T = () => num("T", ++t);
  const rooms = [
    room("Dining hall", 1, 1, 14, 12, "wood"),
    room("Bar", 15, 1, 10, 6, "marble"),
    room("Kitchen", 15, 7, 10, 6, "tile"),
    room("Lobby", 1, 13, 8, 8, "marble"),
    room("Restroom · Men", 9, 13, 4, 4, "tile"),
    room("Restroom · Women", 9, 17, 4, 4, "tile"),
    room("Private dining", 13, 13, 12, 8, "carpet"),
    room("Terrace", 25, 1, 6, 14, "deck"),
  ];
  const walls = [
    // exterior
    ...run("h", 1, 1, 25, [[3, 7], [9, 13]], "wall", EXT),
    ...run("h", 1, 3, 7, [], "window", EXT),
    ...run("h", 1, 9, 13, [], "window", EXT),
    ...run("v", 1, 1, 21, [[3, 11], [18, 19]], "wall", EXT),
    ...run("v", 1, 3, 11, [], "window", EXT),
    ...run("h", 21, 1, 25, [[4, 6]], "wall", EXT),
    ...run("v", 25, 1, 21, [[3, 5], [5, 7]], "wall", EXT),
    ...run("v", 25, 5, 7, [], "glass", EXT),
    // interior
    ...run("v", 15, 1, 13, [[2, 6], [9, 10]]),
    ...run("h", 7, 15, 25, [[22.5, 23.5]]),
    ...run("h", 13, 1, 25, [[4, 8], [14, 15]]),
    ...run("v", 9, 13, 21, [[15, 16], [19, 20]]),
    ...run("h", 17, 9, 13),
    ...run("v", 13, 13, 21),
    // terrace railing
    ...run("h", 1, 25, 31, [], "railing"),
    ...run("v", 31, 1, 15, [], "railing"),
    ...run("h", 15, 25, 31, [], "railing"),
  ];
  const items: Item[] = [
    // dining
    ...[3.5, 7, 10.5].flatMap((y) => [3.5, 7.5, 11.5].map((x) => at("table-round", x, y, { w: 2, h: 2, label: T() }))),
    at("plant", 1.7, 1.7),
    at("plant", 1.7, 12.2),
    // bar
    at("bar-counter", 20, 2.9, { w: 8, h: 1.6 }),
    ...[17, 20, 23].map((x) => at("high-table", x, 5.3, { label: num("H", x === 17 ? 1 : x === 20 ? 2 : 3) })),
    // kitchen
    at("kitchen-line", 19, 8.5, { w: 6, h: 1.3 }),
    at("kitchen-line", 19, 12.1, { w: 6, h: 1.3, rotation: 180 }),
    at("fridge", 24, 8.2, { w: 1.2, h: 1.2 }),
    at("fridge", 24, 9.6, { w: 1.2, h: 1.2 }),
    // lobby
    at("cashier", 2.6, 14.3, { label: "Pay here" }),
    at("sofa", 8.3, 17.5, { w: 2.5, h: 1, rotation: -90 }),
    at("restroom", 8.2, 14.2),
    at("plant", 1.8, 20.2),
    at("entrance", 5, 19.6),
    at("you-are-here", 5.2, 17.2),
    at("exit", 1.9, 17.4, { rotation: 90 }),
    // private dining
    at("table-rect", 19, 17, { w: 6, h: 2, seats: 10, label: "P01" }),
    at("plant", 24.2, 20.2),
    // restrooms
    at("wc", 12.3, 14.6, { rotation: 90 }),
    at("sink", 10.2, 16.3, { rotation: 180 }),
    at("wc", 12.3, 18.6, { rotation: 90 }),
    at("sink", 10.2, 20.3, { rotation: 180 }),
    // terrace
    ...[3, 6.5, 10, 13].flatMap((y) => [26.8, 29.4].map((x) => at("table-square", x, y, { w: 1.8, h: 1.8, seats: 2, label: T() }))),
    // doors
    door("door-double", "h", 5, 21, "up"),
    door("door-double", "v", 4, 25, "right"),
    door("door", "v", 9.5, 15, "right"),
    door("door", "h", 23, 7, "down"),
    door("door", "h", 14.5, 13, "down"),
    door("door", "v", 15.5, 9, "right"),
    door("door", "v", 19.5, 9, "right"),
    door("door", "v", 18.5, 1, "left"),
  ];
  return { version: 2, floors: [floor("Ground floor", 32, 22, rooms, walls, items)] };
}

function barLounge(): Venue {
  const rooms = [
    room("Club floor", 1, 1, 18, 12, "concrete"),
    room("Bar", 19, 1, 10, 8, "marble"),
    room("VIP lounge", 19, 9, 10, 10, "carpet"),
    room("Entrance", 1, 13, 8, 6, "tile"),
    room("Restroom · Men", 9, 13, 5, 6, "tile"),
    room("Restroom · Women", 14, 13, 5, 6, "tile"),
  ];
  const walls = [
    ...run("h", 1, 1, 29, [], "wall", EXT),
    ...run("v", 1, 1, 19, [], "wall", EXT),
    ...run("h", 19, 1, 29, [[4, 6]], "wall", EXT),
    ...run("v", 29, 1, 19, [[16, 17]], "wall", EXT),
    ...run("v", 19, 1, 19, [[2, 8], [10, 12]]),
    ...run("h", 9, 19, 29),
    ...run("h", 13, 1, 19, [[3, 7], [11, 12], [16, 17]]),
    ...run("v", 9, 13, 19),
    ...run("v", 14, 13, 19),
  ];
  const items: Item[] = [
    at("dance-floor", 10, 6, { w: 8, h: 6 }),
    at("dj-booth", 10, 2.4, { w: 3, h: 1.1 }),
    ...[3.5, 7.5].map((y) => at("sofa", 2, y, { w: 3, h: 1.1, rotation: 90 })),
    ...[3.5, 7.5].map((y, i) => at("table-square", 3.6, y, { w: 1.2, h: 1.2, seats: 0, label: num("L", i + 1) })),
    ...[3.5, 6.5].map((x, i) => at("booth", x, 11.6, { w: 2.6, h: 2, rotation: 180, label: num("B", i + 1) })),
    ...[3, 6, 9].map((y, i) => at("high-table", 16.5, y, { label: num("H", i + 1) })),
    at("bar-counter", 24, 3.3, { w: 8, h: 1.6 }),
    at("fridge-row", 24, 2.1, { w: 6, h: 0.5, label: "" }),
    ...[21, 24, 27].map((x, i) => at("high-table", x, 6.5, { label: num("H", i + 4) })),
    // VIP
    at("sofa", 22, 10.2, { w: 4, h: 1.1 }),
    at("table-square", 22, 12, { w: 1.6, h: 1.6, seats: 0, label: "V01" }),
    at("armchair", 20.2, 12),
    at("armchair", 23.8, 12),
    at("sofa", 26, 17.8, { w: 4, h: 1.1, rotation: 180 }),
    at("table-square", 26, 16, { w: 1.6, h: 1.6, seats: 0, label: "V02" }),
    at("plant", 28.3, 9.7),
    at("label", 24, 14.5, { w: 4, h: 0.8, label: "VIP" }),
    // entrance
    at("cashier", 3, 14.4, { label: "Coat check" }),
    at("entrance", 5, 17.6),
    at("you-are-here", 7.5, 16.2),
    at("restroom", 11.5, 12.2),
    at("exit", 28.2, 16.5, { rotation: 90 }),
    // restrooms
    ...[10.2, 12].map((x) => at("wc", x, 18.3, { rotation: 180 })),
    at("sink", 12.8, 14.6),
    ...[15.2, 17].map((x) => at("wc", x, 18.3, { rotation: 180 })),
    at("sink", 17.8, 14.6),
    // doors
    door("door-double", "h", 5, 19, "up"),
    door("door-double", "v", 11, 19, "right"),
    door("door", "h", 11.5, 13, "down"),
    door("door", "h", 16.5, 13, "down"),
    door("door", "v", 16.5, 29, "right"),
  ];
  return { version: 2, floors: [floor("Ground floor", 30, 20, rooms, walls, items)] };
}

function shop(): Venue {
  const rooms = [
    room("Sales floor", 1, 1, 22, 18, "tile"),
    room("Storage", 23, 1, 6, 10, "concrete"),
    room("Office", 23, 11, 6, 4, "carpet"),
    room("Staff WC", 23, 15, 6, 4, "tile"),
  ];
  const walls = [
    ...run("h", 1, 1, 29, [], "wall", EXT),
    ...run("v", 1, 1, 19, [], "wall", EXT),
    ...run("h", 19, 1, 29, [[2, 16], [18, 20], [20.5, 22.5]], "wall", EXT),
    ...run("h", 19, 2, 16, [], "window", EXT),
    ...run("h", 19, 20.5, 22.5, [], "window", EXT),
    ...run("v", 29, 1, 19, [[3, 5]], "wall", EXT),
    ...run("v", 23, 1, 19, [[8, 9], [12, 13], [16, 17]]),
    ...run("h", 11, 23, 29),
    ...run("h", 15, 23, 29),
  ];
  const items: Item[] = [
    at("fridge-row", 12, 2.3, { w: 18, h: 1, label: "Dairy & drinks" }),
    at("shelf", 1.7, 9, { w: 12, h: 0.75, rotation: 90, label: "" }),
    ...[0, 1, 2, 3].map((i) => at("gondola", 7, 4.5 + i * 2.6, { w: 7, h: 1.25, label: `Aisle ${i + 1}` })),
    ...[0, 1, 2, 3].map((i) => at("gondola", 16, 4.5 + i * 2.6, { w: 7, h: 1.25, label: `Aisle ${i + 5}` })),
    ...[4, 8, 12].map((x, i) => at("checkout", x, 16.4, { w: 3, h: 1.25, label: num("C", i + 1) })),
    at("display-table", 18.5, 16.2, { w: 1.8, h: 1.8 }),
    at("info", 21.5, 14.2, { label: "Customer service" }),
    at("entrance", 19, 17.8, { label: "Entrance" }),
    at("you-are-here", 21, 16.8),
    // back of house
    ...[3, 6].map((y) => at("shelf", 26, y, { w: 5, h: 0.75, label: "" })),
    at("desk", 25, 13, { w: 1.6, h: 1 }),
    at("wc", 27.8, 16, { rotation: 90 }),
    at("sink", 24.5, 18.2, { rotation: 180 }),
    at("label", 26, 9.5, { w: 4, h: 0.8, label: "Staff only" }),
    at("exit", 28.2, 6, { rotation: 90 }),
    // doors
    door("door-double", "h", 19, 19, "up"),
    door("door-double", "v", 4, 29, "right"),
    door("door", "v", 8.5, 23, "right"),
    door("door", "v", 12.5, 23, "right"),
    door("door", "v", 16.5, 23, "right"),
  ];
  return { version: 2, floors: [floor("Ground floor", 30, 20, rooms, walls, items)] };
}

function hotel(): Venue {
  let t = 0;
  const groundRooms = [
    room("Lounge", 1, 1, 12, 12, "carpet"),
    room("Restroom · Men", 1, 9, 3, 4, "tile"),
    room("Restroom · Women", 4, 9, 3, 4, "tile"),
    room("Restaurant", 13, 1, 18, 12, "wood"),
    room("Lobby", 1, 13, 18, 8, "marble"),
    room("Lifts & stairs", 19, 13, 6, 8, "tile"),
    room("Back office", 25, 13, 6, 8, "carpet"),
  ];
  const groundWalls = [
    ...run("h", 1, 1, 31, [[14, 30]], "wall", EXT),
    ...run("h", 1, 14, 30, [], "window", EXT),
    ...run("v", 1, 1, 21, [[2, 8]], "wall", EXT),
    ...run("v", 1, 2, 8, [], "window", EXT),
    ...run("h", 21, 1, 31, [[3, 8], [9, 11], [12, 17]], "wall", EXT),
    ...run("h", 21, 3, 8, [], "glass", EXT),
    ...run("h", 21, 12, 17, [], "glass", EXT),
    ...run("v", 31, 1, 21, [], "wall", EXT),
    ...run("h", 9, 1, 7, [[2, 3], [5, 6]]),
    ...run("v", 4, 9, 13),
    ...run("v", 7, 9, 13),
    ...run("v", 13, 1, 13, [[5, 7]]),
    ...run("h", 13, 1, 31, [[8, 12], [15, 17]]),
    ...run("v", 19, 13, 21, [[14, 20]]),
    ...run("v", 25, 13, 21, [[18, 19]]),
  ];
  const groundItems: Item[] = [
    // lounge
    at("bar-counter", 7, 3, { w: 6, h: 1.5, label: "Lobby bar" }),
    at("sofa", 3, 6.5, { w: 3, h: 1.1 }),
    at("table-square", 3, 5, { w: 1.3, h: 1.3, seats: 0, label: "L01" }),
    at("armchair", 9, 5.5),
    at("armchair", 11, 5.5),
    at("plant", 12.2, 8.2),
    // restrooms
    at("wc", 2.5, 12.2, { rotation: 180 }),
    at("wc", 5.5, 12.2, { rotation: 180 }),
    // restaurant
    ...[3, 6.5, 10].flatMap((y) => [16, 20, 24, 28].map((x) => at("table-round", x, y, { w: 2, h: 2, label: num("T", ++t) }))),
    // lobby
    at("reception", 9, 14.6, { w: 5, h: 1.5 }),
    at("sofa", 2, 16.5, { w: 3, h: 1.1, rotation: 90 }),
    at("sofa", 4.5, 19.5, { w: 3, h: 1.1, rotation: 180 }),
    at("table-square", 4, 17, { w: 1.2, h: 1.2, seats: 0, label: "" }),
    at("plant", 17.8, 20),
    at("plant", 1.8, 14),
    at("info", 15, 16, { label: "Concierge" }),
    at("entrance", 10, 19.6),
    at("you-are-here", 12.5, 18.2),
    at("restroom", 5.5, 13.7),
    // core
    at("elevator", 20.2, 14.3, { w: 1.5, h: 1.5 }),
    at("elevator", 22, 14.3, { w: 1.5, h: 1.5 }),
    at("stairs", 23.8, 15.6, { w: 1.5, h: 4 }),
    // office
    at("desk", 28, 15, { w: 1.6, h: 1 }),
    at("desk", 28, 18, { w: 1.6, h: 1 }),
    at("label", 28, 20, { w: 4, h: 0.8, label: "Staff only" }),
    // doors
    door("door-double", "h", 10, 21, "up"),
    door("door-double", "v", 6, 13, "right"),
    door("door-double", "h", 16, 13, "up"),
    door("door", "h", 2.5, 9, "down"),
    door("door", "h", 5.5, 9, "down"),
    door("door", "v", 18.5, 25, "right"),
  ];

  // Upper floor: corridor with guest rooms on both sides.
  const upperRooms: Room[] = [room("Corridor", 1, 9, 30, 4, "carpet")];
  const upperWalls: Wall[] = [
    ...run("h", 1, 1, 31, [], "window", EXT),
    ...run("v", 1, 1, 21, [], "wall", EXT),
    ...run("h", 21, 1, 31, [], "wall", EXT),
    ...run("v", 31, 1, 21, [], "wall", EXT),
  ];
  const upperItems: Item[] = [];
  const topXs = [1, 6, 11, 16, 21, 26];
  topXs.forEach((x, i) => {
    const no = 101 + i;
    upperRooms.push(room(`Room ${no}`, x, 1, 5, 8, "wood"));
    upperRooms.push(room("", x, 1, 2, 2.5, "tile"));
    if (i > 0) upperWalls.push(...run("v", x, 1, 9));
    upperWalls.push(...run("v", x + 2, 1, 3.5), ...run("h", 3.5, x, x + 2, [[x + 0.6, x + 1.4]]));
    upperItems.push(
      at("bed-double", x + 3.2, 4.5, { w: 1.8, h: 2.1 }),
      at("desk", x + 1.2, 7, { w: 1.4, h: 0.9, rotation: 90 }),
      at("wc", x + 0.6, 1.8),
      door("door", "h", x + 1, 3.5, "down", 0.8),
      at("label", x + 3.5, 8, { w: 2.5, h: 0.6, label: String(no) }),
      door("door", "h", x + 4, 9, "up", 0.9),
    );
  });
  upperWalls.push(...run("h", 9, 1, 31, topXs.map((x) => [x + 3.55, x + 4.45] as [number, number])));
  const bottomRooms: [number, number, string][] = [
    [1, 6, "107"],
    [7, 6, "108"],
    [13, 6, "109"],
    [25, 6, "110"],
  ];
  bottomRooms.forEach(([x, w, no], i) => {
    upperRooms.push(room(`Room ${no}`, x, 13, w, 8, "wood"));
    if (i > 0) upperWalls.push(...run("v", x, 13, 21));
    upperItems.push(
      at("bed-double", x + w / 2, 18, { w: 1.8, h: 2.1, rotation: 180 }),
      at("desk", x + w - 1, 15.5, { w: 1.4, h: 0.9, rotation: -90 }),
      at("label", x + w / 2, 15, { w: 2.5, h: 0.6, label: no }),
      door("door", "h", x + 1, 13, "down", 0.9),
    );
  });
  upperRooms.push(room("Lifts & stairs", 19, 13, 6, 8, "tile"));
  upperWalls.push(
    ...run("v", 19, 13, 21, [[14, 20]]),
    ...run("v", 25, 13, 21),
    ...run(
      "h",
      13,
      1,
      31,
      bottomRooms.map(([x]) => [x + 0.55, x + 1.45] as [number, number]).concat([[19, 25]]),
    ),
  );
  upperItems.push(
    at("elevator", 20.2, 14.3, { w: 1.5, h: 1.5 }),
    at("elevator", 22, 14.3, { w: 1.5, h: 1.5 }),
    at("stairs", 23.8, 15.6, { w: 1.5, h: 4 }),
    at("exit", 30.2, 11, { rotation: 90 }),
    at("you-are-here", 21, 17.5),
    at("info", 16, 11, { label: "Ice & vending" }),
  );

  return {
    version: 2,
    floors: [
      floor("Ground floor", 32, 22, groundRooms, groundWalls, groundItems),
      floor("First floor", 32, 22, upperRooms, upperWalls, upperItems),
    ],
  };
}

export type TemplateKey = "restaurant" | "bar" | "shop" | "hotel" | "blank";

export const TEMPLATES: {
  key: TemplateKey;
  name: string;
  description: string;
  icon: string;
  build: () => Venue;
}[] = [
  { key: "restaurant", name: "Restaurant / café", description: "Dining hall, bar, kitchen, terrace, restrooms", icon: "restaurant-outline", build: restaurant },
  { key: "bar", name: "Bar / lounge / club", description: "Dance floor, DJ, bar, VIP lounge, booths", icon: "wine-outline", build: barLounge },
  { key: "shop", name: "Shop / supermarket", description: "Aisles, fridges, checkouts, storage", icon: "cart-outline", build: shop },
  { key: "hotel", name: "Hotel", description: "Lobby, reception, restaurant + guest-room floor", icon: "bed-outline", build: hotel },
  {
    key: "blank",
    name: "Start from scratch",
    description: "An empty 30 × 20 m floor",
    icon: "square-outline",
    build: () => ({
      version: 2,
      floors: [{ id: uid(), name: "Ground floor", w: u(30), h: u(20), rooms: [], walls: [], items: [] }],
    }),
  },
];
