import React, {useEffect, useState} from "react";
import { Text, View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import  useAuth from '@/store/Authentication/useAuth'


type OwnerTopNavbarProps = {
  title?: string;
  email: string;
  avatarInitial: string;
};

export default function OwnerTopNavbar({
  title = "Dashboard Overview",
  email,
  avatarInitial,
}: OwnerTopNavbarProps) {
const { fetchProfile } = useAuth();
const profile = useAuth((state) => state.profile);

useEffect(() => {
  fetchProfile();
}, []);

console.log("Profile:", profile);
  

  return (
    <View className="py-3 px-8 bg-white flex-row items-center justify-between  ">
      
      <View className="flex-row items-center space-x-8">
        <View>
          <Text className="text-xl font-bold text-slate-900 leading-tight">
            {title}
          </Text>
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {profile?.company?.name} Administration
          </Text>
        </View>

      </View>


      <View className="flex-row items-center space-x-6">
        

        <View className="flex-row items-center space-x-2 border-r border-slate-100 pr-6">
          <TouchableOpacity className="p-2 rounded-xl bg-slate-50">
            <Ionicons name="notifications-outline" size={22} color="#475569" />
            <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-xl bg-slate-50">
            <Ionicons name="settings-outline" size={22} color="#475569" />
          </TouchableOpacity>
        </View>


        <TouchableOpacity className="flex-row items-center">
          <View className="items-end mr-3">
            <Text className="text-sm font-bold text-slate-900">{profile?.name}</Text>
            <Text className="text-[10px] font-medium text-slate-400">{profile?.email}</Text>
          </View>
          
          <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center shadow-md shadow-emerald-200">
            <Text className="text-white font-black text-lg">{avatarInitial}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}