import { ArrowLeft, Plus } from "lucide-react-native"; 
import React, { useState } from "react";
import useRole from "@/store/Employee/useRole";

import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AddRoleProps = {
  onBack?: () => void;
};

export default function AddRole({ onBack }: AddRoleProps) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const { addRole } = useRole();
  const handleAddRole = async (name: string, description: string) => {
    if (!name.trim()) {
      alert("Role name is required");
      return;
    }
    await addRole({ name, description });
    setRoleName("");
    setDescription("");
    if (onBack) onBack();
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100 flex-row items-center gap-3">
        <TouchableOpacity onPress={onBack} className="p-1 -ml-1">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>

        <Text className="text-xl font-bold text-gray-900">Add Role</Text>
      </View>

      <View className="p-5 gap-6">
        {/* Card Container */}
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm gap-5">
          {/* Input: Role Name */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-gray-700">
              Role Name
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:border-green-500"
              placeholder="e.g. Content Manager"
              placeholderTextColor="#9ca3af"
              value={roleName}
              onChangeText={setRoleName}
            />
          </View>

          {/* Input: Description */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-gray-700">
              Description
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 min-h-[100] text-top focus:border-green-500"
              placeholder="Describe what users with this role can do..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        <TouchableOpacity className="" onPress={() => handleAddRole(roleName, description)}>
          <View className="flex-row gap-3 mt-2  bg-green-500 border border-green-500 py-3.5 rounded-xl items-center justify-center">
            <Plus size={18} color="white" />
            <Text className="text-white font-semibold text-base">Create Role</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
