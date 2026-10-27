// Renders one floor as an architectural-style plan (SVG, world units via viewBox).
import React from "react";
import Svg, { Defs, G, Line, Pattern, Rect, Text as SvgText } from "react-native-svg";
import { C, drawItem, MATERIALS, showsLabel } from "./catalog";
import { PX_PER_M, type Floor, type Material, type Wall } from "./types";

type Props = {
  floor: Floor;
  scale: number;
  showGrid?: boolean;
  // When set, everything not in the set is faded so the matches stand out.
  focusIds?: Set<string> | null;
  showCompass?: boolean;
  // Pattern ids must be unique per page on web.
  idPrefix?: string;
  // Per-item label colours (e.g. table status).
  tagColors?: Record<string, { bg: string; fg: string }>;
};

function MaterialPattern({ id, material }: { id: string; material: Material }) {
  const m = MATERIALS[material];
  switch (material) {
    case "wood":
    case "deck": {
      const plank = material === "deck" ? 16 : 12;
      return (
        <Pattern id={id} patternUnits="userSpaceOnUse" width={120} height={plank * 2}>
          <Rect width={120} height={plank * 2} fill={m.base} />
          <Line x1={0} y1={plank} x2={120} y2={plank} stroke={m.line} strokeWidth={1} />
          <Line x1={0} y1={plank * 2} x2={120} y2={plank * 2} stroke={m.line} strokeWidth={1} />
          <Line x1={40} y1={0} x2={40} y2={plank} stroke={m.line} strokeWidth={1} />
          <Line x1={95} y1={plank} x2={95} y2={plank * 2} stroke={m.line} strokeWidth={1} />
        </Pattern>
      );
    }
    case "tile":
    case "marble": {
      const size = material === "tile" ? 20 : 40;
      return (
        <Pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
          <Rect width={size} height={size} fill={m.base} />
          <Line x1={0} y1={0} x2={size} y2={0} stroke={m.line} strokeWidth={1} />
          <Line x1={0} y1={0} x2={0} y2={size} stroke={m.line} strokeWidth={1} />
          {material === "marble" && (
            <Line x1={4} y1={30} x2={30} y2={8} stroke={m.line} strokeWidth={0.6} opacity={0.7} />
          )}
        </Pattern>
      );
    }
    case "grass":
      return (
        <Pattern id={id} patternUnits="userSpaceOnUse" width={40} height={40}>
          <Rect width={40} height={40} fill={m.base} />
          <Rect width={40} height={20} fill={m.line} opacity={0.5} />
        </Pattern>
      );
    case "water":
      return (
        <Pattern id={id} patternUnits="userSpaceOnUse" width={30} height={14}>
          <Rect width={30} height={14} fill={m.base} />
          <Line x1={0} y1={7} x2={14} y2={7} stroke={m.line} strokeWidth={1.2} />
        </Pattern>
      );
    default:
      return (
        <Pattern id={id} patternUnits="userSpaceOnUse" width={16} height={16}>
          <Rect width={16} height={16} fill={m.base} />
          <Rect x={3} y={4} width={1.5} height={1.5} fill={m.line} />
          <Rect x={11} y={10} width={1.5} height={1.5} fill={m.line} />
        </Pattern>
      );
  }
}

function WallShape({ wall }: { wall: Wall }) {
  const { start: a, end: b, thickness: t } = wall;
  switch (wall.kind) {
    case "window":
      return (
        <G>
          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={t} strokeLinecap="square" />
          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.white} strokeWidth={Math.max(2, t - 4)} />
          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.glassLine} strokeWidth={1.5} />
        </G>
      );
    case "glass":
      return (
        <G>
          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.glass} strokeWidth={Math.max(4, t * 0.5)} />
          <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.glassLine} strokeWidth={1} />
        </G>
      );
    case "railing":
      return (
        <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={3} strokeDasharray="8 5" opacity={0.6} />
      );
    default:
      return <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={t} strokeLinecap="square" />;
  }
}

export default function FloorRenderer({
  floor,
  scale,
  showGrid,
  focusIds,
  showCompass,
  idPrefix = "vm",
  tagColors,
}: Props) {
  const usedMaterials = Array.from(new Set(floor.rooms.map((r) => r.material)));
  const faded = (id: string) => (focusIds && !focusIds.has(id) ? 0.22 : 1);

  return (
    <Svg width={floor.w * scale} height={floor.h * scale} viewBox={`0 0 ${floor.w} ${floor.h}`}>
      <Defs>
        {usedMaterials.map((m) => (
          <MaterialPattern key={m} id={`${idPrefix}-${m}`} material={m} />
        ))}
        {showGrid && (
          <Pattern id={`${idPrefix}-grid`} patternUnits="userSpaceOnUse" width={PX_PER_M} height={PX_PER_M}>
            <Rect width={PX_PER_M} height={PX_PER_M} fill="#ECEDE6" />
            <Line x1={0} y1={0} x2={PX_PER_M} y2={0} stroke="#DCDED4" strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={PX_PER_M} stroke="#DCDED4" strokeWidth={1} />
          </Pattern>
        )}
      </Defs>

      {/* Ground */}
      <Rect width={floor.w} height={floor.h} fill={showGrid ? `url(#${idPrefix}-grid)` : "#E9EAE3"} />

      {/* Rooms */}
      {floor.rooms.map((room) => (
        <G key={room.id} opacity={faded(room.id)}>
          <Rect
            x={room.x}
            y={room.y}
            width={room.w}
            height={room.h}
            fill={`url(#${idPrefix}-${room.material})`}
            stroke={C.ink}
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        </G>
      ))}

      {/* Items */}
      {floor.items.map((item) => (
        <G
          key={item.id}
          opacity={faded(item.id)}
          transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.w / 2} ${item.h / 2})`}
        >
          {drawItem(item)}
        </G>
      ))}

      {/* Walls on top of floors and furniture edges */}
      {floor.walls.map((wall) => (
        <G key={wall.id} opacity={focusIds ? 0.6 : 1}>
          <WallShape wall={wall} />
        </G>
      ))}

      {/* Room names */}
      {floor.rooms.map((room) => {
        if (!room.name) return null;
        // Shrink long names so they fit inside narrow rooms.
        const fontSize = Math.max(8, Math.min(13, (room.w - 16) / (room.name.length * 0.78)));
        const cx = room.x + room.w / 2;
        const name = room.name.toUpperCase();
        const area = `${Math.round((room.w / PX_PER_M) * (room.h / PX_PER_M))} m²`;
        // A soft halo keeps names readable over patterned floors and furniture.
        const halo = { stroke: MATERIALS[room.material].base, strokeWidth: 4, strokeLinejoin: "round" as const };
        return (
          <G key={`name-${room.id}`} opacity={faded(room.id)}>
            {[halo, null].map((h, i) => (
              <G key={i}>
                <SvgText
                  x={cx}
                  y={room.y + 8 + fontSize}
                  fontSize={fontSize}
                  fontWeight="bold"
                  fill={C.ink}
                  fillOpacity={0.6}
                  textAnchor="middle"
                  letterSpacing={fontSize > 10 ? 1.5 : 0.5}
                  {...(h ?? {})}
                >
                  {name}
                </SvgText>
                <SvgText x={cx} y={room.y + 20 + fontSize} fontSize={9} fill={C.ink} fillOpacity={0.45} textAnchor="middle" {...(h ?? {})}>
                  {area}
                </SvgText>
              </G>
            ))}
          </G>
        );
      })}

      {/* Item labels (never rotated, always readable) */}
      {floor.items.filter(showsLabel).map((item) => {
        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;
        const isText = item.type === "label";
        const tc = tagColors?.[item.id];
        if (tc) {
          const wTag = Math.max(24, (item.label ?? "").length * 7 + 10);
          return (
            <G key={`label-${item.id}`} opacity={faded(item.id)}>
              <Rect x={cx - wTag / 2} y={cy - 9} width={wTag} height={18} rx={9} fill={tc.bg} stroke={C.ink} strokeOpacity={0.25} />
              <SvgText x={cx} y={cy + 4} fontSize={11} fontWeight="bold" fill={tc.fg} textAnchor="middle">
                {item.label}
              </SvgText>
            </G>
          );
        }
        const counterY = item.type === "bar-counter" ? item.y + item.h * 0.36 : null;
        const big = item.type === "stage" || item.type === "dance-floor" || item.type === "pool";
        const fill =
          item.type === "dance-floor" || item.type === "dj-booth" ? C.lime : item.type === "bar-counter" ? C.white : C.ink;
        // Labels that would cover the drawing go underneath it instead.
        const below = (["entrance", "you-are-here", "stairs", "elevator", "cashier", "reception", "checkout", "info"] as string[]).includes(item.type);
        return (
          <G key={`label-${item.id}`} opacity={faded(item.id)}>
            <SvgText
              x={cx}
              y={below ? item.y + item.h + 14 : counterY ?? cy + (isText ? 6 : 4)}
              fontSize={isText ? 16 : big ? 14 : 11}
              fontWeight="bold"
              fill={fill}
              textAnchor="middle"
              stroke={below || isText ? "#F4F5EF" : undefined}
              strokeWidth={below || isText ? 3 : 0}
            >
              {item.label}
            </SvgText>
            {(below || isText) && (
              <SvgText
                x={cx}
                y={below ? item.y + item.h + 14 : cy + 6}
                fontSize={isText ? 16 : 11}
                fontWeight="bold"
                fill={fill}
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            )}
          </G>
        );
      })}

      {/* North arrow + scale bar */}
      {showCompass && (
        <G>
          <G transform={`translate(${floor.w - 46} 22)`}>
            <Rect x={0} y={0} width={30} height={40} rx={6} fill={C.white} stroke={C.ink} strokeOpacity={0.15} />
            <Line x1={15} y1={30} x2={15} y2={10} stroke={C.ink} strokeWidth={2} />
            <SvgText x={15} y={9} fontSize={8} fontWeight="bold" fill={C.ink} textAnchor="middle">
              N
            </SvgText>
          </G>
          <G transform={`translate(20 ${floor.h - 22})`}>
            <Rect x={0} y={-4} width={PX_PER_M * 5} height={8} fill={C.white} stroke={C.ink} strokeWidth={1} />
            <Rect x={0} y={-4} width={PX_PER_M} height={8} fill={C.ink} />
            <Rect x={PX_PER_M * 2} y={-4} width={PX_PER_M} height={8} fill={C.ink} />
            <Rect x={PX_PER_M * 4} y={-4} width={PX_PER_M} height={8} fill={C.ink} />
            <SvgText x={PX_PER_M * 5 + 6} y={4} fontSize={10} fill={C.ink}>
              5 m
            </SvgText>
          </G>
        </G>
      )}
    </Svg>
  );
}
