import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

type PagerProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
};

function NavButton({
  icon,
  disabled,
  onPress,
  label,
}: {
  icon: "chevron-back" | "chevron-forward";
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`w-8 h-8 rounded-lg items-center justify-center border border-ink/10 ${
        disabled ? "opacity-40" : "bg-white active:bg-ivory"
      }`}
    >
      <Ionicons name={icon} size={14} color={brand.ink} />
    </Pressable>
  );
}

// "Showing 1–24 of 87" with compact page buttons: first, last, current ± 1.
export default function Pager({ page, pageCount, total, pageSize, onChange }: PagerProps) {
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const pages: (number | "gap")[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  return (
    <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
      <Text className="text-ink/50 text-xs">
        Showing <Text className="text-ink font-bold">{from}–{to}</Text> of{" "}
        <Text className="text-ink font-bold">{total}</Text>
      </Text>
      {pageCount > 1 && (
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <NavButton
            icon="chevron-back"
            disabled={page <= 0}
            onPress={() => onChange(page - 1)}
            label="Previous page"
          />
          {pages.map((p, i) =>
            p === "gap" ? (
              <Text key={`gap-${i}`} className="text-ink/30 text-xs px-1">
                …
              </Text>
            ) : (
              <Pressable
                key={p}
                onPress={() => onChange(p)}
                accessibilityLabel={`Page ${p + 1}`}
                accessibilityState={{ selected: p === page }}
                className={`min-w-[32px] h-8 px-2 rounded-lg items-center justify-center ${
                  p === page ? "bg-ink" : "active:bg-white"
                }`}
              >
                <Text className={`text-xs font-bold ${p === page ? "text-lime" : "text-ink/60"}`}>
                  {p + 1}
                </Text>
              </Pressable>
            ),
          )}
          <NavButton
            icon="chevron-forward"
            disabled={page >= pageCount - 1}
            onPress={() => onChange(page + 1)}
            label="Next page"
          />
        </View>
      )}
    </View>
  );
}
