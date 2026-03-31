import AddWorker from "@/app/(owner)/workers/addWorker";
import { users as initialUsers } from "@/seed/users";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Workers() {
  const [userList, setUserList] = useState(initialUsers);
  const [view, setView] = useState<"list" | "add">("list");

  const renderUserItem = ({ item }: { item: (typeof initialUsers)[0] }) => (
    <View className="bg-white p-4 rounded-2xl mb-4 flex-row items-center shadow-sm border border-slate-100">
      <Image
        source={{ uri: item.profilePicture }}
        className="w-14 h-14 rounded-full bg-slate-200"
      />

      {/* User Info */}
      <View className="flex-1 ml-4">
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-slate-800">{item.name}</Text>
          <View
            className={`ml-2 px-2 py-0.5 rounded-md ${item.role === "owner" ? "bg-purple-100" : "bg-blue-100"}`}
          >
            <Text
              className={`text-[10px] font-bold uppercase ${item.role === "owner" ? "text-purple-600" : "text-blue-600"}`}
            >
              {item.role}
            </Text>
          </View>
        </View>
        <Text className="text-slate-500 text-sm">{item.email}</Text>

        <View className="flex-row mt-2 items-center">
          <Ionicons name="card-outline" size={14} color="#64748b" />
          <Text className="text-slate-500 text-xs ml-1">PIN: {item.pin}</Text>
          <Text className="text-slate-300 mx-2">|</Text>
          <Ionicons
            name="flash-outline"
            size={14}
            color={item.faceidEnabled ? "#059669" : "#94a3b8"}
          />
          <Text className="text-slate-500 text-xs ml-1">
            FaceID: {item.faceidEnabled ? "ON" : "OFF"}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-emerald-700 font-bold mb-2">
          {item.salary?.toLocaleString()} RWF
        </Text>
        <TouchableOpacity className="bg-slate-50 p-2 rounded-full border border-slate-200">
          <Ionicons name="ellipsis-horizontal" size={20} color="#334155" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (view === "add") {
    return <AddWorker onBack={() => setView("list")} />;
  }

  return (
    <View className="flex-1 bg-slate-50 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-3xl font-black text-slate-900">Staff</Text>
          <Text className="text-slate-500">Manage your team and roles</Text>
        </View>
        <TouchableOpacity
          className="bg-emerald-600 flex-row rounded-xl py-1 px-3 items-center justify-center shadow-lg shadow-emerald-200"
          onPress={() => setView("add")}
        >
          <Ionicons name="add" size={30} color="white" />
          <Text className="text-white font-bold ml-2">Add Worker</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-white flex-row items-center px-4 py-3 rounded-xl border border-slate-200 mb-6">
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          placeholder="Search worker name..."
          className="flex-1 ml-3 text-base"
        />
      </View>

      {/* User List */}
      <FlatList
        data={userList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
