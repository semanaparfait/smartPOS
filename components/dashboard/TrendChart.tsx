import { brand } from "@/config/theme";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

export interface TrendPoint {
  label: string; // axis label, e.g. "09:00" or "Mon 3"
  current: number | null; // null = not reached yet (future hours)
  previous: number;
}

const PLOT_H = 190;
const AXIS_H = 22;
const Y_W = 44;
const GRID = "rgba(32,40,59,0.07)";

export const shortRwf = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};

// A "nice" axis max so gridlines land on round numbers.
const niceMax = (v: number) => {
  if (v <= 0) return 1000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v) ?? 10;
  return step * pow * 4;
};

// Current period as an ink line over a soft lime area; the previous period is a
// gray context line. Tap anywhere on the plot to read a point.
export default function TrendChart({
  points,
  currentLabel,
  previousLabel,
  labelEvery = 1,
}: {
  points: TrendPoint[];
  currentLabel: string;
  previousLabel: string;
  labelEvery?: number;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const max = useMemo(
    () => niceMax(Math.max(0, ...points.map((p) => Math.max(p.current ?? 0, p.previous)))),
    [points],
  );

  const plotW = Math.max(0, width - Y_W);
  const step = points.length > 1 ? plotW / (points.length - 1) : plotW;
  const x = (i: number) => Y_W + i * step;
  const y = (v: number) => PLOT_H - (v / max) * (PLOT_H - 8);

  const path = (vals: (number | null)[]) =>
    vals.reduce((d, v, i) => (v === null ? d : `${d}${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`), "");

  const currentVals = points.map((p) => p.current);
  const lastIdx = currentVals.reduce<number>((last, v, i) => (v !== null ? i : last), -1);
  const linePath = path(currentVals);
  const areaPath =
    lastIdx >= 0 ? `${linePath}L${x(lastIdx).toFixed(1)},${PLOT_H}L${x(0).toFixed(1)},${PLOT_H}Z` : "";
  const prevPath = path(points.map((p) => p.previous));
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const sel = active !== null ? points[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active) - 80, Y_W), Math.max(Y_W, width - 160)) : 0;

  return (
    <View>
      {/* Legend */}
      <View className="flex-row items-center mb-3" style={{ gap: 16 }}>
        <View className="flex-row items-center">
          <View className="w-4 h-[2px] rounded-full bg-ink" />
          <Text className="text-ink/70 text-[12px] ml-1.5">{currentLabel}</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-4 h-[2px] rounded-full" style={{ backgroundColor: brand.inkDisabled }} />
          <Text className="text-ink/50 text-[12px] ml-1.5">{previousLabel}</Text>
        </View>
        <Text className="text-ink/30 text-[11px] ml-auto">Tap the chart to read a point</Text>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: PLOT_H + AXIS_H }}>
        {width > 0 && (
          <Svg width={width} height={PLOT_H + AXIS_H}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={brand.lime} stopOpacity={0.55} />
                <Stop offset="1" stopColor={brand.lime} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>

            {grid.map((g) => (
              <React.Fragment key={g}>
                <Line x1={Y_W} x2={width} y1={y(g)} y2={y(g)} stroke={GRID} strokeWidth={1} />
                <SvgText x={Y_W - 8} y={y(g) + 4} fontSize={10} fill={brand.inkMuted} textAnchor="end">
                  {shortRwf(g)}
                </SvgText>
              </React.Fragment>
            ))}

            {points.map((p, i) =>
              i % labelEvery === 0 || i === points.length - 1 ? (
                <SvgText
                  key={`l${i}`}
                  x={x(i)}
                  y={PLOT_H + 16}
                  fontSize={10}
                  fill={brand.inkMuted}
                  textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}

            {prevPath ? (
              <Path d={prevPath} stroke={brand.inkDisabled} strokeWidth={2} fill="none" strokeLinejoin="round" />
            ) : null}
            {areaPath ? <Path d={areaPath} fill="url(#trendFill)" /> : null}
            {linePath ? (
              <Path d={linePath} stroke={brand.ink} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}

            {/* End-of-line marker so "where we are now" is obvious */}
            {lastIdx >= 0 && active === null && (
              <Circle cx={x(lastIdx)} cy={y(points[lastIdx].current ?? 0)} r={4.5} fill={brand.ink} stroke={brand.white} strokeWidth={2} />
            )}

            {sel && active !== null && (
              <>
                <Line x1={x(active)} x2={x(active)} y1={0} y2={PLOT_H} stroke={brand.ink} strokeOpacity={0.25} strokeWidth={1} />
                <Circle cx={x(active)} cy={y(sel.previous)} r={4} fill={brand.inkDisabled} stroke={brand.white} strokeWidth={2} />
                {sel.current !== null && (
                  <Circle cx={x(active)} cy={y(sel.current)} r={4.5} fill={brand.ink} stroke={brand.white} strokeWidth={2} />
                )}
              </>
            )}
          </Svg>
        )}

        {/* Hit targets: one column per point, wider than the mark */}
        <View className="absolute flex-row" style={{ left: Y_W - step / 2, top: 0, height: PLOT_H, width: plotW + step }}>
          {points.map((p, i) => (
            <Pressable
              key={i}
              style={{ flex: 1 }}
              onPress={() => setActive(active === i ? null : i)}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              accessibilityLabel={`${p.label}: ${p.current === null ? "not yet" : shortRwf(p.current)}, ${previousLabel} ${shortRwf(p.previous)}`}
            />
          ))}
        </View>

        {sel && (
          <View
            pointerEvents="none"
            className="absolute bg-white rounded-xl border border-ink/10 px-3 py-2"
            style={{ left: tipLeft, top: 4, width: 160, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
          >
            <Text className="text-ink/50 text-[11px]">{sel.label}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-ink text-[12px]">{currentLabel}</Text>
              <Text className="text-ink text-[12px] font-semibold">
                {sel.current === null ? "—" : `${Math.round(sel.current).toLocaleString()} RWF`}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-0.5">
              <Text className="text-ink/50 text-[12px]">{previousLabel}</Text>
              <Text className="text-ink/60 text-[12px]">{Math.round(sel.previous).toLocaleString()} RWF</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
