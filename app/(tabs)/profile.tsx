import { Ionicons } from "@expo/vector-icons";
import React, {useState} from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import useAuth from '@/store/Authentication/useAuth'

export default function Profile() {
  const { fetchProfile } = useAuth();
  console.log("Profile data:", fetchProfile);
  const user = {
    name: "Semana Parfait",
    email: "shemaparfait7@gmail.com",
    phone: "+250 788 000 000",
    role: "Senior Cashier",
    department: "Sales & Operations",
    pin: "••••••",
    faceIdEnabled: true,
    workerId: "EMP-2026-001",
    joinedDate: "15 Jan 2026",
    shiftStart: "08:00 AM",
    shiftEnd: "05:00 PM",
    avatar:
      "https://lh3.googleusercontent.com/pw/AP1GczOFTKlkkBIQGoklaa6Irz6qpH6arrL4JcZuOH7dOgrjUyAjk2lWKFN8MgQe76hTzNmwpsyuCvLpBWqZE-cxcz2PXaOObpRnfbhFDymYb_qi24jSmiIa5geBkhapxuUoKFzcmBNTQzHrG-fd53d2LiRjsw=w600-h600-s-no-gm?authuser=0",
  };


  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-8 py-6">
        <View className="flex-row items-center justify-between mb-6 gap-3">
          <Text className="text-4xl font-black text-gray-900">
            Staff Profile
          </Text>
          <View className="rounded-xl bg-green-100 px-3 py-1">
            <Text className="text-xs font-bold text-green-800">
              Active Shift
            </Text>
          </View>
        </View>

        <View className="flex-row gap-6">
          {/* LEFT COLUMN: PERSONAL INFO & ACTIONS */}
          <View className="flex-1">
            <View className="rounded-3xl bg-white p-6 shadow-lg">
              <View className="mb-4 items-center">
                <View>
                  <Image
                    source={{ uri: user.avatar }}
                    className="h-28 w-28 rounded-full border-4 border-gray-100"
                  />
                  <TouchableOpacity className="absolute bottom-0 right-0 rounded-full border-4 border-white bg-green-600 p-2">
                    <Ionicons name="camera" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-center text-2xl font-bold text-gray-900">
                {user.name}
              </Text>
              <Text className="mt-1 text-center text-base text-gray-500">
                {user.role}
              </Text>

              <View className="my-5 h-px w-full bg-gray-100" />

              <View className="w-full gap-5">
                <InfoItem
                  icon="mail"
                  label="Email Address"
                  value={user.email}
                />
                <InfoItem
                  icon="call"
                  label="Contact Number"
                  value={user.phone}
                />
                <InfoItem
                  icon="time"
                  label="Working Shift"
                  value={`${user.shiftStart} - ${user.shiftEnd}`}
                />
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View className="mt-5 gap-3">
              <TouchableOpacity className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <Ionicons name="lock-closed-outline" size={20} color="green" />
                <Text className="text-base font-semibold text-gray-700">
                  Change Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <Ionicons name="keypad-outline" size={20} color="green" />
                <Text className="text-base font-semibold text-gray-700">
                  Reset System PIN
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT COLUMN: PROFESSIONAL ID CARD & SECURITY */}
          <View className="flex-1 gap-6" style={{ flex: 1.4 }}>
            {/* CLASSIC BUSINESS/STAFF CARD */}
            <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <View className="flex-row items-start justify-between bg-gray-900 px-5 py-5">
                <View>
                  <Text className="text-lg font-black text-white tracking-wider">
                    SMART POS SYSTEMS
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-gray-400">
                    Staff Identification Card
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={24} color="white" />
              </View>

              <View className="flex-row gap-5 p-7">
                <View className="border-2 border-gray-200 bg-gray-100">
                  <Image
                    source={{ uri: user.avatar }}
                    className="h-32 w-24 rounded-xl bg-gray-100"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-gray-900">
                    {user.name.toUpperCase()}
                  </Text>
                  <Text className="mt-1 font-bold text-green-600">
                    {user.role}
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500">
                    {user.department}
                  </Text>

                  <View className="mt-3 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold tracking-wider text-gray-400">
                        ID
                      </Text>
                      <Text className="mt-1 text-sm font-black text-gray-900">
                        {user.workerId}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold tracking-wider text-gray-400">
                        JOINED
                      </Text>
                      <Text className="mt-1 text-sm font-black text-gray-900">
                        {user.joinedDate}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="h-px bg-gray-100" />

              <View className="flex-row items-center gap-4 bg-gray-50 px-7 py-5">
                <View className="border-2 border-gray-200 bg-white p-2">
                  <Ionicons name="qr-code" size={50} color="#1F2937" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold tracking-wider text-gray-400">
                    SCAN TO VERIFY
                  </Text>
                  <Text className="mt-1 text-sm font-black text-gray-900">
                    {user.workerId}
                  </Text>
                </View>
              </View>

              <View className="h-1 bg-green-600" />
            </View>

            {/* PIN & SECURITY SECTION */}
            <View className="rounded-3xl bg-white p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                PIN & Security
              </Text>

              {/* PIN DISPLAY */}
              <View className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  System PIN
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-3xl font-black tracking-[8px] text-gray-900">
                    {user.pin}
                  </Text>
                  <TouchableOpacity className="rounded-lg bg-green-600 px-3 py-2">
                    <Text className="text-xs font-bold text-white">Change</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FACE ID */}
              <SecurityRow
                icon="scan"
                label="Face ID"
                value={user.faceIdEnabled ? "Active" : "Inactive"}
                isStatus
              />
              <SecurityRow
                icon="shield-checkmark"
                label="Account Status"
                value="Verified"
                isStatus
              />
              <SecurityRow
                icon="phone-portrait"
                label="Linked Device"
                value="POS Tablet-04"
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
    <View className="h-9 w-9 items-center justify-center rounded-full bg-green-50">
      <Ionicons name={icon} size={18} color="green" />
    </View>
    <View className="flex-1">
      <Text className="text-xs font-semibold uppercase text-gray-400">
        {label}
      </Text>
      <Text className="text-sm font-medium text-gray-700">{value}</Text>
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
  <View className="flex-row items-center justify-between border-b border-gray-100 py-4 last:border-b-0">
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={20} color="#6B7280" />
      <Text className="text-sm text-gray-600">{label}</Text>
    </View>
    <Text
      className={`text-sm font-semibold ${isStatus ? "font-bold text-green-600" : "text-gray-900"}`}
    >
      {value}
    </Text>
  </View>
);
