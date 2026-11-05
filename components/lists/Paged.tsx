import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";

// Draws a long list a page at a time, with "Show more" under it, so screens
// with hundreds of rows open fast and scroll smoothly. Use it where you would
// write `items.map(render)`.
export default function Paged<T>({
  items,
  render,
  page = 40,
}: {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
  page?: number;
}) {
  const [shown, setShown] = useState(page);
  const rest = items.length - shown;
  return (
    <>
      {items.slice(0, shown).map(render)}
      {rest > 0 && (
        <Pressable
          onPress={() => setShown((n) => n + page)}
          className="self-center flex-row items-center bg-white border border-ink/10 rounded-xl px-4 py-2.5 my-2"
        >
          <Ionicons name="chevron-down" size={15} color={brand.ink} />
          <Text className="text-ink text-[13px] font-semibold ml-2">
            {tr("Show more")} ({rest})
          </Text>
        </Pressable>
      )}
    </>
  );
}
