import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { ShieldCheck } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DeviceInfo from "react-native-device-info";

type ActivationKeyProps = {
  onActivated?: () => void;
};

export default function ActivationKey({ onActivated }: ActivationKeyProps) {
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const { deviceInformation, setDeviceInformation, sendDeviceInfo } =
    useDeviceInfo();

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        setDeviceId(await DeviceInfo.getUniqueId());
      } catch (error) {
        console.warn("Unable to load device ID.", error);
      }
    };

    loadDeviceId();
  }, []);

  const isFilled = value.length === 6;

  const handleChange = (text: string) => {
    const cleaned = text
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    setValue(cleaned);
    if (status !== "idle") setStatus("idle");
  };

  const handleActivate = async () => {
    if (!isFilled || status === "loading") return;
    setStatus("loading");
    try {
      const payload = {
        deviceId: await DeviceInfo.getUniqueId(),
        deviceName: await DeviceInfo.getDeviceName(),
        deviceOs: `${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`,
        companyCode: value,
      };
      const registered = await sendDeviceInfo(payload);

      if (!registered) {
        setStatus("error");
        return;
      }

      setStatus("success");
      onActivated?.();
    } catch (error) {
      setStatus("error");
    }
  };

  const borderColor =
    status === "error"
      ? "border-red-700"
      : status === "success"
        ? "border-emerald-500"
        : focused
          ? "border-indigo-400"
          : isFilled
            ? "border-indigo-600"
            : "border-slate-700";

  const inputBg =
    status === "error"
      ? "bg-red-950"
      : status === "success"
        ? "bg-emerald-950"
        : isFilled
          ? "bg-indigo-950"
          : "bg-slate-800";

  const inputTextColor =
    status === "error"
      ? "#fca5a5"
      : status === "success"
        ? "#6ee7b7"
        : isFilled
          ? "#c7d2fe"
          : "#f1f5f9";

  return (
    <View
      className="flex-1 bg-slate-950"
    >
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <View className="p-7">
            <View className="items-center mb-7">
              <View className="w-20 h-20 bg-[#1e293b]/50 border border-[#334155]/60 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-emerald-500/10">
                <ShieldCheck size={42} color="#10b981" strokeWidth={1.5} />
              </View>

              <Text className="text-3xl font-semibold text-white tracking-tight text-center">
                Activate <Text className="text-[#10b981]">Device</Text>
              </Text>

              <Text className="text-slate-400 text-center mt-3 text-base px-4 leading-relaxed">
                This device is not verified.{"\n"}Enter your company code to
                activate the app.
              </Text>
            </View>

            <View className="flex-row rounded-xl bg-slate-800 border border-slate-700 mb-7 overflow-hidden">
              <View className="flex-1 px-4 py-3 border-r border-slate-700">
                <Text className="text-slate-500 text-xs font-semibold tracking-widest mb-1">
                  DEVICE ID
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  className="text-slate-200 text-xs font-mono"
                >
                  RW - {deviceId} - POS
                </Text>
              </View>
              <View className="px-4 py-3 justify-center">
                <Text className="text-slate-500 text-xs font-semibold tracking-widest mb-1">
                  STATUS
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <Text className="text-red-400 text-xs font-semibold">
                    PENDING
                  </Text>
                </View>
              </View>
            </View>

            <Text className="text-slate-500 text-xs font-semibold tracking-widest mb-3">
              ACTIVATION KEY
            </Text>

            <TextInput
              ref={inputRef}
              className={`h-14 rounded-xl px-4 text-base font-mono border mb-1 ${borderColor} ${inputBg}`}
              style={{ color: inputTextColor, letterSpacing: 3 }}
              value={value}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              placeholder="XXXXXX"
              placeholderTextColor="#334155"
              selectionColor="#818cf8"
            />

            <Text className="text-slate-600 text-xs text-right mb-2">
              {value.length} / 6
            </Text>

            {status === "error" && (
              <View className="flex-row items-center bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-5 gap-3">
                <Text className="text-red-400 text-base">✕</Text>
                <Text className="text-red-300 text-sm flex-1">
                  Invalid activation key. Please double-check and try again.
                </Text>
              </View>
            )}
            {status === "success" && (
              <View className="flex-row items-center bg-emerald-950 border border-emerald-700 rounded-xl px-4 py-3 mb-5 gap-3">
                <Text className="text-emerald-400 text-base">✓</Text>
                <Text className="text-emerald-300 text-sm flex-1">
                  Device activated successfully!
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={[
                "h-14 rounded-xl items-center justify-center mb-4",
                isFilled && status !== "loading"
                  ? "bg-indigo-600"
                  : status === "loading"
                    ? "bg-indigo-800"
                    : "bg-slate-800",
              ].join(" ")}
              onPress={handleActivate}
              activeOpacity={0.85}
              disabled={!isFilled || status === "loading"}
            >
              <Text
                className={[
                  "text-sm font-bold tracking-wide",
                  isFilled ? "text-white" : "text-slate-600",
                ].join(" ")}
              >
                {status === "loading" ? "Verifying key..." : "Activate Device"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center py-1 mb-6">
              <Text className="text-slate-500 text-sm">
                Don't have a key?{" "}
                <Text className="text-indigo-400 font-semibold">
                  {" "}
                  Contact Support
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-slate-700 text-xs text-center mt-5">
          Secured by your organization's IT policy
        </Text>
      </ScrollView>
    </View>
  );
}
