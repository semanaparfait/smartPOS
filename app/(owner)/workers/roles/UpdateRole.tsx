import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface RoleFormState {
  name: string;
  description: string;
}

export default function UpdateRole() {
  const router = useRouter();
  

  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const roleId = Array.isArray(id) ? id[0] : id;


  const { rolesResponse, getRoles, updateRole } = useRole();

  const [form, setForm] = useState<RoleFormState>({
    name: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoleDetails = async () => {
      if (!roleId) {
        setLoading(false);
        return;
      }

      try {

        await getRoles();
        const activeRole = rolesResponse.find((r) => r.id === roleId);

        if (activeRole) {
          setForm({
            name: activeRole.name || "",
            description: activeRole.description || "",
          });
        }
      } catch (error) {
        console.error("Failed to load role details:", error);
        Toast.show({
          type: "error",
          text1: "Failed to load role details",
          text2: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
        
      } finally {
        setLoading(false);
      }
    };

    loadRoleDetails();
  }, [roleId]);

  const handleSave = async () => {
    if (!roleId) return;

    if (!form.name.trim()) {
      Alert.alert("Missing field", "Role name is required.");
      return;
    }

    try {
      
      await updateRole(roleId, {
        name: form.name.trim(),
        description: form.description.trim()  || null,
      });
      Toast.show({
        type: "success",
        text1: "Role updated successfully",
      });
      router.back();
    } catch (error) {
      console.error("Failed to update role:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update role",   
         text2: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      
    }
  };

  if (!roleId) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
        <Text className="text-base font-semibold text-slate-700 mt-2">
          No role selected.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="text-slate-500 mt-3 font-medium">
          Loading role details...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-50"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header section */}
        <View className="px-6 pt-4 pb-5 bg-white border-b border-slate-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-slate-900 tracking-tight">
                Update Role
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                Modify role details and configurations.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-2xl bg-slate-100 p-3 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Core Form Container */}
        <View className="p-6">
          <View className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            
            {/* Role Name Input */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Role Name
              </Text>
              <TextInput
                className="border-b border-slate-200 pb-2 text-base text-slate-900 font-medium focus:border-emerald-600"
                value={form.name}
                onChangeText={(val) => setForm({ ...form, name: val })}
                placeholder="e.g. Waiter, Manager"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Role Description Input */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl p-3 text-base text-slate-900 font-medium focus:border-emerald-600 text-top"
                value={form.description}
                onChangeText={(val) => setForm({ ...form, description: val })}
                placeholder="Describe responsibilities for this role..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                style={{ height: 100 }}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              className="bg-emerald-700 py-4 rounded-2xl items-center shadow-sm active:bg-emerald-800"
            >
              <Text className="font-bold text-white text-base">
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}