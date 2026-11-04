import { Input, Label } from "@/components/forms/FormKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { PayType } from "@/store/Employee/EmployeeType";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

const digits = (v: string) => v.replace(/[^0-9]/g, "");

// How a worker is paid: a monthly salary, or an amount for each delivery they
// make. The per-delivery choice shows only for riders.
export default function PayFields({
  payType,
  salary,
  perDelivery,
  canPerDelivery,
  onChange,
}: {
  payType: PayType;
  salary: string;
  perDelivery: string;
  canPerDelivery: boolean;
  onChange: (patch: { payType?: PayType; salary?: string; perDelivery?: string }) => void;
}) {
  const perDeliveryOn = canPerDelivery && payType === "PER_DELIVERY";

  const option = (value: PayType, icon: keyof typeof Ionicons.glyphMap, title: string, hint: string) => {
    const on = (value === "PER_DELIVERY") === perDeliveryOn;
    return (
      <Pressable
        onPress={() => onChange({ payType: value })}
        accessibilityState={{ selected: on }}
        className={`flex-1 min-w-[150px] rounded-xl border p-3.5 ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Ionicons name={icon} size={16} color={on ? brand.lime : brand.inkMuted} />
          <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{title}</Text>
        </View>
        <Text className={`text-xs mt-1 ${on ? "text-white/60" : "text-ink/50"}`}>{hint}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {canPerDelivery ? (
        <View>
          <Label>{tr("How is this worker paid?")}</Label>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {option("MONTHLY", "calendar-outline", tr("Monthly salary"), tr("The same amount every month"))}
            {option("PER_DELIVERY", "bicycle-outline", tr("Per delivery"), tr("An amount for each delivery made"))}
          </View>
        </View>
      ) : null}

      {perDeliveryOn ? (
        <View>
          <Label required>{tr("Paid for each delivery")}</Label>
          <Input
            icon="bicycle-outline"
            value={perDelivery}
            keyboardType="numeric"
            placeholder="0"
            suffix="RWF"
            onChangeText={(val) => onChange({ perDelivery: digits(val) })}
          />
          <Text className="text-ink/40 text-[11px] mt-1.5">
            {Number(perDelivery) > 0
              ? `${tr("Example")}: 40 ${tr("deliveries")} = ${(40 * Number(perDelivery)).toLocaleString()} RWF ${tr("that month")}`
              : tr("Payroll counts the deliveries they marked delivered each month.")}
          </Text>
        </View>
      ) : (
        <View>
          <Label>{tr("Monthly salary")}</Label>
          <Input
            icon="cash-outline"
            value={salary}
            keyboardType="numeric"
            placeholder="0"
            suffix="RWF"
            onChangeText={(val) => onChange({ salary: digits(val) })}
          />
        </View>
      )}
    </View>
  );
}

// The role lets the worker carry deliveries.
export const isRiderRole = (role?: { permissions?: string[] | null } | null) =>
  !!role?.permissions?.includes("deliveries.ride");
