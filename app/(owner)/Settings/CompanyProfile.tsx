import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import React, { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import useAuth from "@/store/Authentication/useAuth";


export default function CompanyProfile() {
  const { fetchProfile } = useAuth();
  const profile = useAuth((state) => state.profile);

  useEffect(() => {
    fetchProfile();
  }, []);

  console.log("Profile:", profile);
  const company = [
    {
      icon: "business",
      label: "Company Name",
      value: profile?.company?.name,
    },
    {
      icon: "apps",
      label: "Industry",
      value: profile?.company?.type,
    },
    {
      icon: "calendar",
      label: "Established On",
      value: profile?.company?.createdAt
        ? new Date(profile.company.createdAt).toLocaleDateString()
        : "N/A",
    },
    {
      icon: "earth",
      label: "Website",
      value: profile?.company?.name
        ? `www.${profile.company.name.toLowerCase().replace(/\s+/g, "")}.com`
        : "N/A",
    },
  ];

  const companyContacts = [
    {
      icon: "call",
      label: "Phone",
      value: profile?.company?.phone_number || "N/A",
    },
    {
      icon: "mail",
      label: "Email",
      value: profile?.company?.email || "N/A",
    },
    {
      icon: "location",
      label: "Address",
      value: profile?.company?.location || "N/A",
    },
  ];
  return (
    <ScrollView className="py-4 px-8">
      <View className="p-4 bg-green-700 rounded-lg flex-row items-center space-x-4">
        <View className="h-24 w-24 rounded-full bg-white items-center justify-center shadow-md ">
          <Ionicons name="business" size={48} color="#15803d" />
        </View>
        <View>
          <Text className="text-white text-2xl font-bold">{profile?.name}</Text>
          <Text className="text-white text-sm">
            Company description goes here. This is a placeholder for the company
            profile information.
          </Text>
          <View className="flex-row items-center rounded-md bg-black w-24 px-2 py-1 mt-2">
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="text-white">Verified</Text>
          </View>
          <Text className="text-white text-sm">
            Company Code :{" "}
            <Text className="font-bold">{profile?.company?.code}</Text>
          </Text>
        </View>
      </View>

      <View className="rounded-2xl shadow mt-6">
        <View className="flex-row items-center gap-4 p-4 ">
          <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center shadow-md ">
            <Ionicons name="business" size={24} color="#15803d" />
          </View>
          <Text className="text-lg font-bold text-slate-900 mb-2">
            Company Details
          </Text>
        </View>

        <View>
          {company.map((item, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between gap-4 p-4  border-t border-slate-200"
            >
              <View className="flex-row items-center gap-3 px-3 py-1 ">
                <Ionicons name={item.icon} size={20} color="#4B5563" />
                <Text className="text-sm text-gray-500">{item.label}</Text>
              </View>

              <Text className="text-md font-medium text-gray-900">
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

            <View className="rounded-2xl shadow mt-6">
        <View className="flex-row items-center gap-4 p-4 ">
          <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center shadow-md ">
            <Ionicons name="call" size={24} color="#15803d" />
          </View>
          <Text className="text-lg font-bold text-slate-900 mb-2">
            Company Contacts
          </Text>
        </View>

        <View>
          {companyContacts.map((item, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between gap-4 p-4  border-t border-slate-200"
            >
              <View className="flex-row items-center gap-3 px-3 py-1 ">
                <Ionicons name={item.icon} size={20} color="#4B5563" />
                <Text className="text-sm text-gray-500">{item.label}</Text>
              </View>

              <Text className="text-md font-medium text-gray-900">
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity className="w-full bg-green-700 py-4 rounded-xl items-center mt-6 shadow-md">
        <Text className="text-white font-bold text-lg">Edit Company Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
