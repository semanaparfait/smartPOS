// Shared building blocks that mirror the SmartPOS website (smart-pos-gold.vercel.app).
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// The SmartPOS receipt-check mark (assets/brand/smartpos-mark.svg) as a scalable component.
export function BrandMark({
  size = 64,
  receipt = "#D0E66B",
  check = "#20283B",
}: {
  size?: number;
  receipt?: string;
  check?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        d="M16 10a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v44l-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4z"
        fill={receipt}
      />
      <Path
        d="M23.5 29.5l6.5 6.5 11.5-13.5"
        fill="none"
        stroke={check}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Live clock for terminal screens, e.g. "09:41" / "Mon, 19 Oct".
export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    date: `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`,
  };
}

// Website `hero-rise` entrance: fade in while rising 16px.
export function Rise({
  delay = 0,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// Small uppercase label with a lime square, used above headlines.
export function Eyebrow({
  children,
  tone = "light",
}: {
  children: string;
  tone?: "light" | "dark";
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`w-2 h-2 bg-lime border ${
          tone === "dark" ? "border-white/20" : "border-ink/20"
        }`}
      />
      <Text
        className={`text-[11px] font-bold uppercase tracking-[3px] ${
          tone === "dark" ? "text-white/60" : "text-ink/60"
        }`}
      >
        {children}
      </Text>
    </View>
  );
}

// Two-line extrabold headline; the second line gets the lime highlighter band.
export function Headline({
  lead,
  mark,
  tone = "light",
  size = 42,
  center = false,
}: {
  lead: string;
  mark: string;
  tone?: "light" | "dark";
  size?: number;
  center?: boolean;
}) {
  const color = tone === "dark" ? "text-white" : "text-ink";
  const textStyle = {
    fontSize: size,
    lineHeight: size * 1.1,
    letterSpacing: -size * 0.035,
  };
  return (
    <View className={center ? "items-center" : ""}>
      <Text className={`${color} font-extrabold`} style={textStyle}>
        {lead}
      </Text>
      {tone === "dark" ? (
        // On ink surfaces the band would hide the text, so the word itself turns lime.
        <Text className="text-lime font-extrabold" style={textStyle}>
          {mark}
        </Text>
      ) : (
        <View className={center ? "self-center" : "self-start"}>
          <View
            className="absolute left-0 right-0 bg-lime"
            style={{ bottom: size * 0.1, height: size * 0.38 }}
          />
          <Text className="text-ink font-extrabold" style={textStyle}>
            {mark}
          </Text>
        </View>
      )}
    </View>
  );
}
