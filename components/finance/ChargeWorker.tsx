// "Charge to worker": turns money missing (a count, a service payment, a rejected
// till expense) into a debt that comes off the worker's salary. Each source is
// charged once.
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import usePayroll, { type ChargeInput } from "@/store/Finance/usePayroll";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import Toast from "react-native-toast-message";

export default function ChargeWorker({ charge, workerName }: { charge: ChargeInput; workerName: string }) {
  const { can } = usePermissions();
  const add = usePayroll((s) => s.charge);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!can("payroll.manage")) return null;

  const press = async () => {
    setBusy(true);
    try {
      await add(charge);
      setDone(true);
      Toast.show({
        type: "success",
        text1: tr("Charged to the worker"),
        text2: `${workerName} · ${Math.round(charge.amount).toLocaleString()} RWF · ${tr("comes off the salary")}`,
      });
    } catch (error) {
      const message = (error as Error).message;
      // Already charged before: show it as done.
      const already = /already charged/i.test(message);
      if (already) setDone(true);
      Toast.show({ type: already ? "info" : "error", text1: tr(already ? "Already charged to the worker" : "Could not charge"), text2: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={press}
      disabled={busy || done}
      className={`flex-row items-center h-9 px-3 rounded-lg border ${done ? "border-ink/10 bg-ivory" : "border-danger/30 active:bg-danger/5"}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={brand.danger} />
      ) : (
        <Ionicons name={done ? "checkmark" : "person-remove-outline"} size={14} color={done ? brand.inkMuted : brand.danger} />
      )}
      <Text className="text-xs font-semibold ml-1.5" style={{ color: done ? brand.inkMuted : brand.danger }}>
        {tr(done ? "Charged to the worker" : "Charge to worker")}
      </Text>
    </Pressable>
  );
}
