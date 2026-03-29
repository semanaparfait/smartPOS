import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CardType = "Worker" | "Student" | "Business";

const profile = {
  name: "Mugisha Thierry",
  email: "thierry@smartpos.rw",
  phone: "+250 788 123 456",
  pin: "2749",
  workerCardId: "WK-5421-88",
  studentCardId: "ST-2401-19",
  businessCardId: "BZ-7782-04",
  role: "Cashier Supervisor",
  department: "Operations",
  branch: "Kigali Downtown",
  joiningDate: "15 Jan 2024",
  shiftFrom: "08:00",
  shiftTo: "18:00",
};

export default function Profile() {
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);
  const [cardType, setCardType] = useState<CardType>("Worker");

  const selectedCard =
    cardType === "Worker"
      ? {
          title: "Worker Card",
          id: profile.workerCardId,
          accent: "#DBEAFE",
          icon: "briefcase-outline" as const,
          subtitle: profile.role,
        }
      : cardType === "Student"
        ? {
            title: "Student Card",
            id: profile.studentCardId,
            accent: "#DCFCE7",
            icon: "school-outline" as const,
            subtitle: "Internship Program",
          }
        : {
            title: "Business Card",
            id: profile.businessCardId,
            accent: "#FEF3C7",
            icon: "business-outline" as const,
            subtitle: "SmartPOS Team",
          };

  return (
    <SafeAreaView className="flex-1 bg-[#F3F5F8]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="px-5 pt-4">
          <View className="rounded-3xl border border-[#D8DEE8] bg-white p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[28px] font-black tracking-tight text-[#1B2A3D]">
                  Profile
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#667085]">
                  Clear and professional account overview
                </Text>
              </View>
              <View className="rounded-xl border border-[#D8DEE8] bg-[#F8FAFC] px-3 py-2">
                <Text className="text-[11px] font-black uppercase tracking-widest text-[#64748B]">
                  Shift
                </Text>
                <Text className="text-sm font-black text-[#0F172A]">
                  {profile.shiftFrom} - {profile.shiftTo}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center">
              <Image
                source={{ uri: "https://i.pravatar.cc/240?img=32" }}
                className="h-20 w-20 rounded-2xl border border-[#D8DEE8]"
              />
              <View className="ml-4 flex-1">
                <Text className="text-2xl font-black text-[#1B2A3D]">
                  {profile.name}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#475467]">
                  {profile.role}
                </Text>
                <View className="mt-2 flex-row" style={{ gap: 8 }}>
                  <View className="rounded-full bg-[#EEF2F6] px-3 py-1">
                    <Text className="text-xs font-bold uppercase tracking-wide text-[#5B6472]">
                      {profile.department}
                    </Text>
                  </View>
                  <View className="rounded-full bg-[#EEF2F6] px-3 py-1">
                    <Text className="text-xs font-bold uppercase tracking-wide text-[#5B6472]">
                      Joined {profile.joiningDate}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Shift From
                </Text>
                <Text className="mt-1 text-lg font-black text-[#0F172A]">
                  {profile.shiftFrom}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Shift To
                </Text>
                <Text className="mt-1 text-lg font-black text-[#0F172A]">
                  {profile.shiftTo}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-[#D8DEE8] bg-white p-5">
            <Text className="text-xs font-black uppercase tracking-[1.8px] text-[#667085]">
              Account Information
            </Text>

            <View className="mt-4" style={{ gap: 12 }}>
              <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Email
                </Text>
                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  {profile.email}
                </Text>
              </View>

              <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Phone Number
                </Text>
                <Text className="mt-1 text-base font-semibold text-[#0F172A]">
                  {profile.phone}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-[#D8DEE8] bg-white p-5">
            <Text className="text-xs font-black uppercase tracking-[1.8px] text-[#667085]">
              Security
            </Text>

            <View className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    PIN
                  </Text>
                  <Text className="mt-1 text-2xl font-black tracking-[10px] text-[#0F172A]">
                    {"*".repeat(profile.pin.length)}
                  </Text>
                </View>
                <View className="rounded-xl bg-[#E2E8F0] px-3 py-2">
                  <Text className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                    4-digit
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E2E8F0]">
                    <Ionicons name="scan-outline" size={20} color="#334155" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-base font-bold text-[#0F172A]">
                      Face ID
                    </Text>
                    <Text className="text-xs font-medium text-[#64748B]">
                      {faceIdEnabled ? "Enabled for quick unlock" : "Disabled"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={faceIdEnabled}
                  onValueChange={setFaceIdEnabled}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: "#CBD5E1", true: "#475569" }}
                />
              </View>
            </View>

            <View className="mt-3" style={{ gap: 10 }}>
              <Pressable className="flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 active:opacity-85">
                <View className="flex-row items-center">
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#334155"
                  />
                  <Text className="ml-3 text-sm font-bold text-[#0F172A]">
                    Change Password
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </Pressable>

              <Pressable className="flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 active:opacity-85">
                <View className="flex-row items-center">
                  <Ionicons name="key-outline" size={18} color="#334155" />
                  <Text className="ml-3 text-sm font-bold text-[#0F172A]">
                    Change System PIN
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <View className="mt-5 rounded-3xl border border-[#D8DEE8] bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-black uppercase tracking-[1.8px] text-[#667085]">
                Card Type
              </Text>
              <Ionicons name="id-card-outline" size={20} color="#475467" />
            </View>

            <View className="mt-3 flex-row" style={{ gap: 8 }}>
              {(["Worker", "Student", "Business"] as CardType[]).map((type) => {
                const selected = cardType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setCardType(type)}
                    className={`rounded-xl border px-3 py-2 ${selected ? "border-[#334155] bg-[#334155]" : "border-[#D0D7E2] bg-white"}`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase tracking-wide ${selected ? "text-white" : "text-[#475467]"}`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 overflow-hidden rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {selectedCard.title}
                  </Text>
                  <Text className="mt-1 text-xl font-black text-[#0F172A]">
                    {selectedCard.id}
                  </Text>
                </View>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: selectedCard.accent }}
                >
                  <Ionicons
                    name={selectedCard.icon}
                    size={18}
                    color="#334155"
                  />
                </View>
              </View>

              <View className="mt-4 flex-row items-center">
                <Image
                  source={{ uri: "https://i.pravatar.cc/220?img=32" }}
                  className="h-14 w-14 rounded-xl border border-[#D0D7E2]"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-black text-[#0F172A]">
                    {profile.name}
                  </Text>
                  <Text className="text-sm font-semibold text-[#475467]">
                    {selectedCard.subtitle}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row" style={{ gap: 8 }}>
                <View className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Department
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#1E293B]">
                    {profile.department}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Joining Date
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#1E293B]">
                    {profile.joiningDate}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
