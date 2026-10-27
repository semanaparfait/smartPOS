// Venue map data model. World units: PX_PER_M units = 1 metre.

export const PX_PER_M = 40;
export const GRID = 10; // snap step (25 cm)

export type Point = { x: number; y: number };

export type Material =
  | "wood"
  | "tile"
  | "marble"
  | "carpet"
  | "concrete"
  | "deck"
  | "grass"
  | "water";

export type WallKind = "wall" | "window" | "glass" | "railing";

export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
};

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  kind: WallKind;
};

export type ItemType =
  // seating
  | "table-round"
  | "table-square"
  | "table-rect"
  | "high-table"
  | "booth"
  | "sofa"
  | "armchair"
  | "bar-stool"
  // service
  | "bar-counter"
  | "cashier"
  | "checkout"
  | "reception"
  | "kitchen-line"
  | "fridge"
  | "dj-booth"
  | "stage"
  | "dance-floor"
  // retail
  | "shelf"
  | "gondola"
  | "fridge-row"
  | "display-table"
  // hospitality
  | "bed-single"
  | "bed-double"
  | "desk"
  | "pool"
  | "sunbed"
  // facilities
  | "restroom"
  | "wc"
  | "sink"
  // structure
  | "door"
  | "door-double"
  | "stairs"
  | "elevator"
  | "pillar"
  | "plant"
  // wayfinding
  | "entrance"
  | "exit"
  | "info"
  | "you-are-here"
  | "label";

export type Item = {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  label?: string;
  seats?: number;
};

export type Floor = {
  id: string;
  name: string;
  w: number;
  h: number;
  rooms: Room[];
  walls: Wall[];
  items: Item[];
};

export type Venue = {
  version: 2;
  floors: Floor[];
};

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const metres = (units: number) => units / PX_PER_M;

export const formatMetres = (units: number) => {
  const m = metres(units);
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} m`;
};

export const snap = (value: number, enabled = true) =>
  enabled ? Math.round(value / GRID) * GRID : value;

export const emptyFloor = (name = "Ground floor"): Floor => ({
  id: uid(),
  name,
  w: 30 * PX_PER_M,
  h: 20 * PX_PER_M,
  rooms: [],
  walls: [],
  items: [],
});
