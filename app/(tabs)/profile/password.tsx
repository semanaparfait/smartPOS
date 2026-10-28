import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import { ProfilePage } from "@/components/profile/profileKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function StaffChangePassword() {
  const router = useRouter();
  const isEmployee = useAuth((state) => state.profile?.role === "EMPLOYEE");

  // Employees can't sign in with a password (the backend only accepts their PIN).
  if (isEmployee) {
    return (
      <ProfilePage title="Change password" subtitle="Employees sign in with a PIN.">
        <View className="bg-white rounded-2xl border border-ink/5 p-6 items-center">
          <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center">
            <Ionicons name="keypad-outline" size={24} color={brand.ink} />
          </View>
          <Text className="text-ink text-[15px] font-bold mt-4">You sign in with your PIN</Text>
          <Text className="text-ink/50 text-[13px] text-center mt-1">
            There's no password to change. You can change your PIN instead.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile/pin")}
            className="flex-row items-center h-12 px-5 rounded-xl bg-lime active:bg-lime-dark mt-5"
          >
            <Text className="text-ink text-sm font-bold">Change PIN</Text>
            <Ionicons name="arrow-forward" size={16} color={brand.ink} style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </ProfilePage>
    );
  }

  return (
    <ProfilePage title="Change password" subtitle="The password you use to sign in with your email.">
      <ChangePasswordForm onDone={() => router.back()} />
    </ProfilePage>
  );
}
