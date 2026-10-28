import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";


import { secureUrl } from "@/utils/imageUrl";
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

export default function Profile() {
  const { profile, fetchProfile } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [photoFailed, setPhotoFailed] = useState(false);

  // Own photo first; the company logo stands in when there isn't one.
  const photoUrl = secureUrl(profile?.picture) ?? secureUrl(profile?.company?.logo);
  useEffect(() => setPhotoFailed(false), [photoUrl]);
  const photo = photoFailed ? undefined : photoUrl;

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const displayValue = (value?: unknown) => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value) || "N/A";
    }

    if (value && typeof value === "object") {
      const record = value as { name?: unknown; id?: unknown };
      return displayValue(record.name ?? record.id);
    }

    return "N/A";
  };
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : "N/A";
  const initials = profile?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  return (
    <ScrollView
      className="flex-1 bg-ivory"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-8 py-6">
        <View className="flex-row items-center justify-between mb-6 gap-3">
          <Text className="text-4xl font-black text-ink">
            Staff Profile
          </Text>
          <View className="rounded-xl bg-lime px-3 py-1">
            <Text className="text-xs font-bold text-ink">
              Active Shift
            </Text>
          </View>
        </View>

        <View className="flex-row gap-6">
          {/* LEFT COLUMN: PERSONAL INFO & ACTIONS */}
          <View className="flex-1">
            <View className="rounded-3xl bg-white p-6 shadow-lg shadow-ink/10">
              <View className="mb-4 items-center">
                <View>
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: brand.ivory }}
                      resizeMode="cover"
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <View className="h-28 w-28 items-center justify-center rounded-full border-4 border-ivory bg-ink">
                      <Text className="text-3xl font-black text-lime">
                        {initials || "?"}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity className="absolute bottom-0 right-0 rounded-full border-4 border-white bg-lime p-2">
                    <Ionicons name="camera" size={18} color={brand.ink} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-center text-2xl font-bold text-ink">
                {displayValue(profile?.name)}
              </Text>
              <Text className="mt-1 text-center text-base text-ink/50">
                {displayValue(profile?.role)}
              </Text>

              <View className="my-5 h-px w-full bg-ink/5" />

              <View className="w-full gap-5">
                <InfoItem
                  icon="mail"
                  label="Email Address"
                  value={displayValue(profile?.email)}
                />
                <InfoItem
                  icon="call"
                  label="Contact Number"
                  value={displayValue(profile?.phone)}
                />
                <InfoItem
                  icon="time"
                  label="Working Shift"
                  value="N/A"
                />
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View className="mt-5 gap-3">
              <TouchableOpacity className="flex-row items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-4 active:bg-ivory">
                <Ionicons name="lock-closed-outline" size={20} color={brand.ink} />
                <Text className="text-base font-semibold text-ink">
                  Change Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-4 active:bg-ivory">
                <Ionicons name="keypad-outline" size={20} color={brand.ink} />
                <Text className="text-base font-semibold text-ink">
                  Reset System PIN
                </Text>
              </TouchableOpacity>

              {/* LANGUAGE — UI only for now; translations will be wired up later */}
              <View className="rounded-2xl border border-ink/10 bg-white px-4 py-4">
                <View className="flex-row items-center gap-3 mb-3">
                  <Ionicons name="language-outline" size={20} color={brand.ink} />
                  <Text className="text-base font-semibold text-ink">
                    Language
                  </Text>
                </View>
                <View className="flex-row flex-wrap justify-between gap-y-2">
                  {LANGUAGES.map((lang) => {
                    const active = lang.code === language;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        onPress={() => setLanguage(lang.code)}
                        className={`w-[48.5%] items-center rounded-xl py-2.5 px-3 ${
                          active ? "bg-ink" : "bg-ivory active:bg-ink/10"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            active ? "text-lime" : "text-ink/70"
                          }`}
                        >
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: PROFESSIONAL ID CARD & SECURITY */}
          <View className="flex-1 gap-6" style={{ flex: 1.4 }}>
            {/* CLASSIC BUSINESS/STAFF CARD */}
            <View className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-ink/20">
              <View className="flex-row items-start justify-between bg-ink px-5 py-5">
                <View>
                  <Text className="text-lg font-black text-white tracking-wider">
                    SMART <Text className="text-lime">POS</Text> SYSTEMS
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-white/50">
                    Staff Identification Card
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={24} color={brand.lime} />
              </View>

              <View className="flex-row gap-5 p-7">
                <View className="border-2 border-ink/10 bg-ivory">
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 96, height: 128, borderRadius: 12, backgroundColor: brand.ivory }}
                      resizeMode="cover"
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <View className="h-32 w-24 items-center justify-center bg-ink">
                      <Text className="text-2xl font-black text-lime">
                        {initials || "?"}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-ink">
                    {displayValue(profile?.name).toUpperCase()}
                  </Text>
                  <Text className="mt-1 font-bold text-ink/70">
                    {displayValue(profile?.role)}
                  </Text>
                  <Text className="text-xs font-semibold text-ink/50">
                    {displayValue(profile?.company?.type)}
                  </Text>

                  <View className="mt-3 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold tracking-wider text-ink/40">
                        ID
                      </Text>
                      <Text className="mt-1 text-sm font-black text-ink">
                        {displayValue(profile?.employee || profile?.id)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold tracking-wider text-ink/40">
                        JOINED
                      </Text>
                      <Text className="mt-1 text-sm font-black text-ink">
                        {joinedDate}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="h-px bg-ink/5" />

              <View className="flex-row items-center gap-4 bg-ivory px-7 py-5">
                <View className="border-2 border-ink/10 bg-white p-2">
                  <Ionicons name="qr-code" size={50} color={brand.ink} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold tracking-wider text-ink/40">
                    SCAN TO VERIFY
                  </Text>
                  <Text className="mt-1 text-sm font-black text-ink">
                    {displayValue(profile?.employee || profile?.id)}
                  </Text>
                </View>
              </View>

              <View className="h-1 bg-lime" />
            </View>

            {/* PIN & SECURITY SECTION */}
            <View className="rounded-3xl bg-white p-6">
              <Text className="text-lg font-bold text-ink mb-4">
                PIN & Security
              </Text>

              {/* PIN DISPLAY */}
              <View className="mb-4 rounded-2xl border border-ink/10 bg-ivory p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-ink/50">
                  System PIN
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-3xl font-black tracking-[8px] text-ink">
                    {profile?.pin ? "••••••" : "N/A"}
                  </Text>
                  <TouchableOpacity className="rounded-lg bg-lime px-3 py-2 active:bg-lime-dark">
                    <Text className="text-xs font-bold text-ink">Change</Text>
                  </TouchableOpacity>
                </View>
              </View>


              <SecurityRow
                icon="shield-checkmark"
                label="Account Status"
                value={profile?.active ? "Verified" : "Inactive"}
                isStatus
              />
              <SecurityRow
                icon="phone-portrait"
                label="Linked Device"
                value={displayValue(profile?.company?.name)}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View className="flex-row items-center gap-3">
    <View className="h-9 w-9 items-center justify-center rounded-full bg-ivory">
      <Ionicons name={icon} size={18} color={brand.ink} />
    </View>
    <View className="flex-1">
      <Text className="text-xs font-semibold uppercase text-ink/40">
        {label}
      </Text>
      <Text className="text-sm font-medium text-ink">{value}</Text>
    </View>
  </View>
);

const SecurityRow = ({
  icon,
  label,
  value,
  isStatus,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isStatus?: boolean;
}) => (
  <View className="flex-row items-center justify-between border-b border-ink/5 py-4 last:border-b-0">
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={20} color={brand.inkMuted} />
      <Text className="text-sm text-ink/60">{label}</Text>
    </View>
    {isStatus ? (
      <View className="rounded-full bg-lime px-2.5 py-1">
        <Text className="text-xs font-bold text-ink">{value}</Text>
      </View>
    ) : (
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    )}
  </View>
);
