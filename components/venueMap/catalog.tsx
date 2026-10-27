// What can be placed on a venue map and how each thing is drawn (top-down, SVG).
import React from "react";
import { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import type { Item, ItemType, Material } from "./types";

export const C = {
  ink: "#20283B",
  inkSoft: "#3A4560",
  lime: "#D0E66B",
  limeDark: "#BFD655",
  ivory: "#F4F5EF",
  white: "#FFFFFF",
  chair: "#F4F5EF",
  steel: "#CDD3DA",
  steelDark: "#9AA4BA",
  glass: "#BFE3F5",
  glassLine: "#7DB9DC",
  green: "#7FB069",
  greenDark: "#5E8F4A",
  exit: "#16A34A",
  water: "#9ED8F0",
  wood: "#C9A77C",
  danger: "#DC2626",
};

export type Category =
  | "Seating"
  | "Service"
  | "Retail"
  | "Hospitality"
  | "Facilities"
  | "Structure"
  | "Wayfinding";

export const CATEGORIES: Category[] = [
  "Seating",
  "Service",
  "Retail",
  "Hospitality",
  "Facilities",
  "Structure",
  "Wayfinding",
];

// Groups shown in the viewer legend, so people can find things by what they are.
export type LegendGroup =
  | "tables"
  | "bar"
  | "pay"
  | "restrooms"
  | "kitchen"
  | "entrances"
  | "stairs"
  | "info";

export const LEGEND: Record<LegendGroup, { label: string; icon: string }> = {
  tables: { label: "Tables & seating", icon: "restaurant-outline" },
  bar: { label: "Bar", icon: "wine-outline" },
  pay: { label: "Pay / reception", icon: "card-outline" },
  restrooms: { label: "Restrooms", icon: "male-female-outline" },
  kitchen: { label: "Kitchen", icon: "flame-outline" },
  entrances: { label: "Entrances & exits", icon: "enter-outline" },
  stairs: { label: "Stairs & lifts", icon: "swap-vertical-outline" },
  info: { label: "Information", icon: "information-circle-outline" },
};

type CatalogEntry = {
  name: string;
  category: Category;
  w: number;
  h: number;
  seats?: number;
  // Auto-numbered label prefix, e.g. "T" -> T1, T2...
  prefix?: string;
  legend?: LegendGroup;
  defaultLabel?: string;
};

export const CATALOG: Record<ItemType, CatalogEntry> = {
  "table-round": { name: "Round table", category: "Seating", w: 80, h: 80, seats: 4, prefix: "T", legend: "tables" },
  "table-square": { name: "Square table", category: "Seating", w: 70, h: 70, seats: 4, prefix: "T", legend: "tables" },
  "table-rect": { name: "Long table", category: "Seating", w: 120, h: 70, seats: 6, prefix: "T", legend: "tables" },
  "high-table": { name: "High table", category: "Seating", w: 50, h: 50, seats: 2, prefix: "H", legend: "tables" },
  booth: { name: "Booth", category: "Seating", w: 100, h: 80, seats: 4, prefix: "B", legend: "tables" },
  sofa: { name: "Sofa", category: "Seating", w: 100, h: 40 },
  armchair: { name: "Armchair", category: "Seating", w: 36, h: 36 },
  "bar-stool": { name: "Stool", category: "Seating", w: 18, h: 18 },

  "bar-counter": { name: "Bar counter", category: "Service", w: 200, h: 60, legend: "bar", defaultLabel: "Bar" },
  cashier: { name: "Cashier", category: "Service", w: 90, h: 50, legend: "pay", defaultLabel: "Pay here" },
  checkout: { name: "Checkout lane", category: "Service", w: 120, h: 50, prefix: "C", legend: "pay" },
  reception: { name: "Reception", category: "Service", w: 140, h: 60, legend: "pay", defaultLabel: "Reception" },
  "kitchen-line": { name: "Kitchen line", category: "Service", w: 160, h: 50, legend: "kitchen" },
  fridge: { name: "Fridge", category: "Service", w: 40, h: 40 },
  "dj-booth": { name: "DJ booth", category: "Service", w: 90, h: 50, defaultLabel: "DJ" },
  stage: { name: "Stage", category: "Service", w: 200, h: 100, defaultLabel: "Stage" },
  "dance-floor": { name: "Dance floor", category: "Service", w: 200, h: 160, defaultLabel: "Dance floor" },

  shelf: { name: "Wall shelf", category: "Retail", w: 160, h: 30, prefix: "A" },
  gondola: { name: "Aisle shelves", category: "Retail", w: 200, h: 50, prefix: "Aisle " },
  "fridge-row": { name: "Fridge row", category: "Retail", w: 160, h: 40, defaultLabel: "Fridges" },
  "display-table": { name: "Display table", category: "Retail", w: 80, h: 80 },

  "bed-single": { name: "Single bed", category: "Hospitality", w: 40, h: 80 },
  "bed-double": { name: "Double bed", category: "Hospitality", w: 64, h: 82 },
  desk: { name: "Desk", category: "Hospitality", w: 60, h: 40 },
  pool: { name: "Pool", category: "Hospitality", w: 240, h: 120, defaultLabel: "Pool" },
  sunbed: { name: "Sun lounger", category: "Hospitality", w: 28, h: 76 },

  restroom: { name: "Restroom sign", category: "Facilities", w: 40, h: 40, legend: "restrooms" },
  wc: { name: "Toilet", category: "Facilities", w: 28, h: 40 },
  sink: { name: "Sink", category: "Facilities", w: 40, h: 26 },

  door: { name: "Door", category: "Structure", w: 36, h: 36 },
  "door-double": { name: "Double door", category: "Structure", w: 72, h: 36 },
  stairs: { name: "Stairs", category: "Structure", w: 60, h: 120, legend: "stairs", defaultLabel: "Stairs" },
  elevator: { name: "Lift", category: "Structure", w: 60, h: 60, legend: "stairs", defaultLabel: "Lift" },
  pillar: { name: "Pillar", category: "Structure", w: 20, h: 20 },
  plant: { name: "Plant", category: "Structure", w: 30, h: 30 },

  entrance: { name: "Entrance", category: "Wayfinding", w: 80, h: 40, legend: "entrances", defaultLabel: "Entrance" },
  exit: { name: "Emergency exit", category: "Wayfinding", w: 60, h: 28, legend: "entrances" },
  info: { name: "Info point", category: "Wayfinding", w: 30, h: 30, legend: "info" },
  "you-are-here": { name: "You are here", category: "Wayfinding", w: 30, h: 30 },
  label: { name: "Text label", category: "Wayfinding", w: 120, h: 30, defaultLabel: "Label" },
};

export const isTable = (type: ItemType) => CATALOG[type].legend === "tables";

export const MATERIALS: Record<Material, { name: string; base: string; line: string }> = {
  wood: { name: "Wood", base: "#EAD9BC", line: "#DCC59F" },
  tile: { name: "Tiles", base: "#EEF0F2", line: "#D6DBE1" },
  marble: { name: "Marble", base: "#F5F3EE", line: "#E3DED3" },
  carpet: { name: "Carpet", base: "#DCDFE8", line: "#CFD3DF" },
  concrete: { name: "Concrete", base: "#E3E3DE", line: "#D3D3CC" },
  deck: { name: "Decking", base: "#D9BE94", line: "#C7A97A" },
  grass: { name: "Garden", base: "#D2E5B4", line: "#C2D99F" },
  water: { name: "Water", base: "#AEDDF2", line: "#93CFEA" },
};

const stroke = { stroke: C.ink, strokeWidth: 1.5 };

function Chair({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${angle})`}>
      <Rect x={-8} y={-7} width={16} height={14} rx={4} fill={C.chair} {...stroke} />
      <Line x1={-7} y1={5} x2={7} y2={5} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

function RoundTable({ w, h, seats }: { w: number; h: number; seats: number }) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 13;
  return (
    <G>
      {Array.from({ length: seats }).map((_, i) => {
        const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
        const d = r + 6;
        return (
          <Chair
            key={i}
            x={cx + Math.cos(a) * d}
            y={cy + Math.sin(a) * d}
            angle={(a * 180) / Math.PI + 90 + 180}
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={r} fill={C.white} {...stroke} />
    </G>
  );
}

function RectTable({ w, h, seats }: { w: number; h: number; seats: number }) {
  const inset = 13;
  const perSide = Math.ceil(seats / 2);
  const bottom = seats - perSide;
  const tw = w - (seats <= 2 ? 0 : 0);
  const chairsAlong = (n: number, y: number, angle: number) =>
    Array.from({ length: n }).map((_, i) => (
      <Chair key={`${y}-${i}`} x={(tw / (n + 1)) * (i + 1)} y={y} angle={angle} />
    ));
  return (
    <G>
      {chairsAlong(perSide, inset - 4, 0)}
      {chairsAlong(bottom, h - inset + 4, 180)}
      <Rect x={2} y={inset} width={w - 4} height={h - inset * 2} rx={4} fill={C.white} {...stroke} />
    </G>
  );
}

function SquareTable({ w, h, seats }: { w: number; h: number; seats: number }) {
  const inset = 13;
  const cx = w / 2;
  const cy = h / 2;
  const spots = [
    { x: cx, y: inset - 4, a: 0 },
    { x: cx, y: h - inset + 4, a: 180 },
    { x: inset - 4, y: cy, a: -90 },
    { x: w - inset + 4, y: cy, a: 90 },
  ].slice(0, Math.min(4, seats));
  return (
    <G>
      {spots.map((s, i) => (
        <Chair key={i} x={s.x} y={s.y} angle={s.a} />
      ))}
      <Rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} rx={4} fill={C.white} {...stroke} />
    </G>
  );
}

// Draws one item in its own box (0..w, 0..h). Rotation is applied by the caller.
export function drawItem(item: Pick<Item, "type" | "w" | "h" | "seats">) {
  const { w, h } = item;
  const seats = item.seats ?? CATALOG[item.type].seats ?? 0;

  switch (item.type) {
    case "table-round":
      return <RoundTable w={w} h={h} seats={seats} />;
    case "table-square":
      return <SquareTable w={w} h={h} seats={seats} />;
    case "table-rect":
      return <RectTable w={w} h={h} seats={seats} />;
    case "high-table": {
      const r = Math.min(w, h) / 2 - 10;
      return (
        <G>
          <Circle cx={w / 2} cy={5} r={7} fill={C.chair} {...stroke} />
          <Circle cx={w / 2} cy={h - 5} r={7} fill={C.chair} {...stroke} />
          <Circle cx={w / 2} cy={h / 2} r={r} fill={C.white} {...stroke} />
        </G>
      );
    }
    case "booth":
      return (
        <G>
          <Path
            d={`M2 2 H${w - 2} V${h - 2} H${w - 16} V16 H16 V${h - 2} H2 Z`}
            fill={C.inkSoft}
            stroke={C.ink}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Rect x={24} y={24} width={w - 48} height={h - 34} rx={3} fill={C.white} {...stroke} />
        </G>
      );
    case "sofa":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill={C.inkSoft} {...stroke} />
          <Rect x={8} y={h * 0.35} width={w - 16} height={h * 0.6} rx={5} fill="#56617E" />
          {Array.from({ length: Math.max(1, Math.round(w / 40)) - 1 }).map((_, i, arr) => (
            <Line
              key={i}
              x1={8 + ((w - 16) / (arr.length + 1)) * (i + 1)}
              y1={h * 0.38}
              x2={8 + ((w - 16) / (arr.length + 1)) * (i + 1)}
              y2={h - 4}
              stroke={C.ink}
              strokeWidth={1}
            />
          ))}
        </G>
      );
    case "armchair":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill={C.inkSoft} {...stroke} />
          <Rect x={7} y={10} width={w - 14} height={h - 14} rx={5} fill="#56617E" />
        </G>
      );
    case "bar-stool":
      return <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 1} fill={C.chair} {...stroke} />;

    case "bar-counter": {
      const counterH = h * 0.5;
      const stools = Math.max(2, Math.floor(w / 34));
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={counterH * 0.35} fill={C.steel} {...stroke} />
          <Rect x={1} y={counterH * 0.35 + 6} width={w - 2} height={counterH * 0.65} rx={6} fill={C.inkSoft} {...stroke} />
          {Array.from({ length: stools }).map((_, i) => (
            <Circle
              key={i}
              cx={(w / stools) * (i + 0.5)}
              cy={counterH + 6 + (h - counterH - 8) / 2}
              r={7.5}
              fill={C.chair}
              {...stroke}
            />
          ))}
        </G>
      );
    }
    case "cashier":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h * 0.55} rx={4} fill={C.white} {...stroke} />
          <Rect x={w / 2 - 12} y={6} width={24} height={14} rx={2} fill={C.ink} />
          <Circle cx={w / 2} cy={h - 9} r={7} fill={C.chair} {...stroke} />
        </G>
      );
    case "checkout":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h * 0.55} rx={3} fill={C.white} {...stroke} />
          {Array.from({ length: Math.floor((w * 0.55) / 6) }).map((_, i) => (
            <Line key={i} x1={6 + i * 6} y1={4} x2={6 + i * 6} y2={h * 0.55 - 3} stroke={C.steelDark} strokeWidth={1} />
          ))}
          <Rect x={w * 0.65} y={5} width={22} height={h * 0.55 - 10} rx={2} fill={C.ink} />
          <Circle cx={w * 0.72} cy={h - 9} r={7} fill={C.chair} {...stroke} />
        </G>
      );
    case "reception":
      return (
        <G>
          <Path
            d={`M2 ${h * 0.15} Q${w / 2} ${-h * 0.15} ${w - 2} ${h * 0.15} V${h * 0.55} Q${w / 2} ${h * 0.25} 2 ${h * 0.55} Z`}
            fill={C.white}
            {...stroke}
          />
          <Circle cx={w * 0.35} cy={h - 10} r={7} fill={C.chair} {...stroke} />
          <Circle cx={w * 0.65} cy={h - 10} r={7} fill={C.chair} {...stroke} />
        </G>
      );
    case "kitchen-line": {
      const burners = Math.max(2, Math.floor((w * 0.6) / 30));
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={2} fill={C.steel} {...stroke} />
          {Array.from({ length: burners }).map((_, i) => (
            <G key={i}>
              <Circle cx={18 + i * 30} cy={h / 2} r={10} fill="none" stroke={C.ink} strokeWidth={1.5} />
              <Circle cx={18 + i * 30} cy={h / 2} r={4} fill={C.ink} />
            </G>
          ))}
          <Rect x={w - 46} y={8} width={38} height={h - 16} rx={6} fill={C.white} {...stroke} />
        </G>
      );
    }
    case "fridge":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={2} fill={C.steel} {...stroke} />
          <Line x1={w / 2} y1={2} x2={w / 2} y2={h - 2} stroke={C.ink} strokeWidth={1} />
        </G>
      );
    case "dj-booth":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={C.ink} />
          <Circle cx={w * 0.28} cy={h / 2} r={Math.min(w, h) * 0.25} fill={C.inkSoft} stroke={C.lime} strokeWidth={1.5} />
          <Circle cx={w * 0.72} cy={h / 2} r={Math.min(w, h) * 0.25} fill={C.inkSoft} stroke={C.lime} strokeWidth={1.5} />
        </G>
      );
    case "stage":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill="#8C6B4A" {...stroke} />
          {Array.from({ length: Math.floor(w / 14) }).map((_, i) => (
            <Line key={i} x1={i * 14} y1={2} x2={i * 14} y2={h - 2} stroke="#7A5C3F" strokeWidth={1} />
          ))}
          <Rect x={1} y={h - 8} width={w - 2} height={7} fill="#6B4F35" />
        </G>
      );
    case "dance-floor": {
      const tile = 20;
      const cols = Math.ceil(w / tile);
      const rows = Math.ceil(h / tile);
      return (
        <G>
          <Rect x={0} y={0} width={w} height={h} fill={C.ink} />
          {Array.from({ length: rows }).flatMap((_, r) =>
            Array.from({ length: cols }).map((__, c) =>
              (r + c) % 2 === 0 ? (
                <Rect
                  key={`${r}-${c}`}
                  x={c * tile}
                  y={r * tile}
                  width={Math.min(tile, w - c * tile)}
                  height={Math.min(tile, h - r * tile)}
                  fill={(r * 3 + c) % 7 === 0 ? C.lime : C.inkSoft}
                  opacity={(r * 3 + c) % 7 === 0 ? 0.7 : 1}
                />
              ) : null,
            ),
          )}
        </G>
      );
    }

    case "shelf":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} fill="#DDE1E6" {...stroke} />
          {Array.from({ length: Math.floor(w / 40) }).map((_, i) => (
            <Line key={i} x1={(i + 1) * 40} y1={1} x2={(i + 1) * 40} y2={h - 1} stroke={C.ink} strokeWidth={1} />
          ))}
        </G>
      );
    case "gondola":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={2} fill="#DDE1E6" {...stroke} />
          <Line x1={1} y1={h / 2} x2={w - 1} y2={h / 2} stroke={C.ink} strokeWidth={1.5} />
          {Array.from({ length: Math.floor(w / 40) }).map((_, i) => (
            <Line key={i} x1={(i + 1) * 40} y1={1} x2={(i + 1) * 40} y2={h - 1} stroke={C.ink} strokeWidth={0.8} />
          ))}
        </G>
      );
    case "fridge-row":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} fill={C.steel} {...stroke} />
          {Array.from({ length: Math.floor(w / 40) }).map((_, i) => (
            <Rect key={i} x={4 + i * 40} y={h * 0.45} width={34} height={h * 0.5} fill={C.glass} stroke={C.glassLine} strokeWidth={1} />
          ))}
        </G>
      );
    case "display-table":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={C.white} {...stroke} />
          {[0.25, 0.5, 0.75].flatMap((fx) =>
            [0.3, 0.7].map((fy) => (
              <Rect key={`${fx}-${fy}`} x={w * fx - 7} y={h * fy - 7} width={14} height={14} rx={2} fill={C.ivory} stroke={C.steelDark} strokeWidth={1} />
            )),
          )}
        </G>
      );

    case "bed-single":
    case "bed-double": {
      const double = item.type === "bed-double";
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill={C.white} {...stroke} />
          {double ? (
            <>
              <Rect x={5} y={5} width={w / 2 - 8} height={14} rx={4} fill={C.ivory} {...stroke} />
              <Rect x={w / 2 + 3} y={5} width={w / 2 - 8} height={14} rx={4} fill={C.ivory} {...stroke} />
            </>
          ) : (
            <Rect x={5} y={5} width={w - 10} height={14} rx={4} fill={C.ivory} {...stroke} />
          )}
          <Rect x={1} y={h * 0.38} width={w - 2} height={h * 0.62 - 1} rx={3} fill="#DCDFE8" {...stroke} />
          <Line x1={1} y1={h * 0.48} x2={w - 1} y2={h * 0.48} stroke={C.ink} strokeWidth={1} />
        </G>
      );
    }
    case "desk":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h * 0.6} rx={2} fill={C.white} {...stroke} />
          <Chair x={w / 2} y={h - 8} angle={180} />
        </G>
      );
    case "pool":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill={C.water} stroke="#5FB4D9" strokeWidth={3} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Line key={i} x1={14} y1={(h / 4) * (i + 1)} x2={w - 14} y2={(h / 4) * (i + 1)} stroke={C.white} strokeWidth={1.5} strokeDasharray="6 5" />
          ))}
        </G>
      );
    case "sunbed":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={C.white} {...stroke} />
          <Line x1={1} y1={h * 0.3} x2={w - 1} y2={h * 0.3} stroke={C.ink} strokeWidth={1} />
        </G>
      );

    case "restroom":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill={C.ink} />
          <SvgText x={w / 2} y={h / 2 + 5} fontSize={14} fontWeight="bold" fill={C.white} textAnchor="middle">
            WC
          </SvgText>
        </G>
      );
    case "wc":
      return (
        <G>
          <Rect x={3} y={1} width={w - 6} height={h * 0.3} rx={3} fill={C.white} {...stroke} />
          <Ellipse cx={w / 2} cy={h * 0.62} rx={w / 2 - 3} ry={h * 0.32} fill={C.white} {...stroke} />
        </G>
      );
    case "sink":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill={C.white} {...stroke} />
          <Ellipse cx={w / 2} cy={h / 2 + 2} rx={w / 2 - 7} ry={h / 2 - 6} fill={C.ivory} {...stroke} />
        </G>
      );

    case "door":
      // Hinge top-left; the wall runs along the top edge, leaf shown open 90°.
      return (
        <G>
          <Rect x={0} y={-6} width={w} height={12} fill={C.white} />
          <Path d={`M ${w} 0 A ${w} ${w} 0 0 1 0 ${w}`} fill="none" stroke={C.ink} strokeWidth={1} strokeDasharray="3 3" />
          <Line x1={0} y1={0} x2={0} y2={w} stroke={C.ink} strokeWidth={3} />
        </G>
      );
    case "door-double": {
      const leaf = w / 2;
      return (
        <G>
          <Rect x={0} y={-6} width={w} height={12} fill={C.white} />
          <Path d={`M ${leaf} 0 A ${leaf} ${leaf} 0 0 1 0 ${leaf}`} fill="none" stroke={C.ink} strokeWidth={1} strokeDasharray="3 3" />
          <Path d={`M ${leaf} 0 A ${leaf} ${leaf} 0 0 0 ${w} ${leaf}`} fill="none" stroke={C.ink} strokeWidth={1} strokeDasharray="3 3" />
          <Line x1={0} y1={0} x2={0} y2={leaf} stroke={C.ink} strokeWidth={3} />
          <Line x1={w} y1={0} x2={w} y2={leaf} stroke={C.ink} strokeWidth={3} />
        </G>
      );
    }
    case "stairs": {
      const steps = Math.max(4, Math.floor(h / 12));
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} fill={C.white} {...stroke} />
          {Array.from({ length: steps - 1 }).map((_, i) => (
            <Line key={i} x1={1} y1={(h / steps) * (i + 1)} x2={w - 1} y2={(h / steps) * (i + 1)} stroke={C.ink} strokeWidth={1} />
          ))}
          <Line x1={w / 2} y1={h - 8} x2={w / 2} y2={10} stroke={C.ink} strokeWidth={1.5} />
          <Polygon points={`${w / 2 - 6},16 ${w / 2 + 6},16 ${w / 2},6`} fill={C.ink} />
        </G>
      );
    }
    case "elevator":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} fill={C.steel} {...stroke} />
          <Line x1={1} y1={1} x2={w - 1} y2={h - 1} stroke={C.ink} strokeWidth={1} />
          <Line x1={w - 1} y1={1} x2={1} y2={h - 1} stroke={C.ink} strokeWidth={1} />
          <Rect x={w / 2 - 14} y={h / 2 - 12} width={28} height={24} rx={4} fill={C.ink} />
          <Polygon points={`${w / 2 - 6},${h / 2 - 2} ${w / 2 + 6},${h / 2 - 2} ${w / 2},${h / 2 - 9}`} fill={C.lime} />
          <Polygon points={`${w / 2 - 6},${h / 2 + 2} ${w / 2 + 6},${h / 2 + 2} ${w / 2},${h / 2 + 9}`} fill={C.lime} />
        </G>
      );
    case "pillar":
      return <Rect x={0} y={0} width={w} height={h} fill={C.ink} />;
    case "plant":
      return (
        <G>
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 1} fill={C.green} stroke={C.greenDark} strokeWidth={1.5} />
          <Circle cx={w * 0.35} cy={h * 0.4} r={Math.min(w, h) * 0.18} fill={C.greenDark} />
          <Circle cx={w * 0.62} cy={h * 0.6} r={Math.min(w, h) * 0.15} fill={C.greenDark} />
        </G>
      );

    case "entrance":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={C.lime} stroke={C.ink} strokeWidth={1.5} />
          <Line x1={w / 2} y1={h - 6} x2={w / 2} y2={10} stroke={C.ink} strokeWidth={2.5} />
          <Polygon points={`${w / 2 - 8},14 ${w / 2 + 8},14 ${w / 2},4`} fill={C.ink} />
        </G>
      );
    case "exit":
      return (
        <G>
          <Rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={C.exit} />
          <SvgText x={w / 2} y={h / 2 + 5} fontSize={13} fontWeight="bold" fill={C.white} textAnchor="middle">
            EXIT
          </SvgText>
        </G>
      );
    case "info":
      return (
        <G>
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 1} fill={C.ink} />
          <SvgText x={w / 2} y={h / 2 + 6} fontSize={16} fontWeight="bold" fill={C.lime} textAnchor="middle">
            i
          </SvgText>
        </G>
      );
    case "you-are-here":
      return (
        <G>
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 1} fill={C.lime} opacity={0.45} />
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 4} fill={C.ink} stroke={C.white} strokeWidth={2} />
        </G>
      );
    case "label":
      return null;
  }
}

// Items whose label is drawn on the map by default (inside or under the item).
export const showsLabel = (item: Item) =>
  !!item.label && item.type !== "restroom" && item.type !== "exit";
