import { brand } from "@/config/theme";
import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, TextInput, View } from "react-native";

type FieldProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  error?: string;
  right?: React.ReactNode;
};

// Branded text input: label, icon tile, lime focus ring, inline error.
export const Field = React.forwardRef<TextInput, FieldProps>(
  ({ label, icon: Icon, focused, error, right, multiline, ...inputProps }, ref) => (
    <View>
      <Text
        className={`text-xs font-semibold mb-2 ${
          error ? "text-red-600" : "text-ink/70"
        }`}
      >
        {label}
      </Text>
      {/* Outer layer draws a soft lime focus ring */}
      <View
        className={`rounded-[14px] p-[3px] ${
          focused && !error ? "bg-lime/50" : "bg-transparent"
        }`}
      >
        <View
          className={`rounded-xl border flex-row pl-2 pr-4 gap-3 ${
            multiline ? "min-h-[120px] items-start py-2" : "h-14 items-center"
          } ${
            error
              ? "bg-red-50 border-red-400"
              : focused
                ? "bg-white border-ink"
                : "bg-ivory border-ink/10"
          }`}
        >
          <View
            className={`w-10 h-10 rounded-lg items-center justify-center ${
              focused ? "bg-ink" : "bg-white"
            }`}
          >
            <Icon
              size={18}
              color={error ? brand.danger : focused ? brand.lime : brand.inkMuted}
              strokeWidth={2}
            />
          </View>
          <TextInput
            ref={ref}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            className={`flex-1 text-ink text-base font-medium ${
              multiline ? "min-h-[100px] pt-2.5" : "h-full"
            }`}
            placeholderTextColor={brand.inkDisabled}
            selectionColor={brand.ink}
            {...inputProps}
          />
          {right}
        </View>
      </View>
      {error ? (
        <Text className="text-red-600 text-xs font-medium mt-1.5">{error}</Text>
      ) : null}
    </View>
  ),
);
Field.displayName = "Field";
