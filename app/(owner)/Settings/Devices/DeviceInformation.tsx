import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import type { DeviceListType } from "@/store/Device/DeviceType";
import {
  Tablet,
  GlobeCheck,
  BeerOff,
  MonitorSmartphone,
  Eye,
  X,
  RefreshCw,
  LogOut,
  Power,
} from "lucide-react-native";

export default function DeviceInformation() {
  const { getDevices, deviceListType } = useDeviceInfo();

  const [activeDevice, setActiveDevice] = useState<DeviceListType | null>(null);

  useEffect(() => {
    getDevices();
  }, []);

  const totalDevices = deviceListType?.length || 0;

  const registeredDevices =
    deviceListType?.filter((d) => d.registrationStatus === "REGISTERED")
      .length || 0;

  const unregisteredDevices = totalDevices - registeredDevices;

  const deviceSummaryCards = [
    {
      icon: Tablet,
      label: "Total Devices",
      backgroundColor: "#2563EB",
      value: totalDevices,
    },
    {
      icon: GlobeCheck,
      label: "Registered",
      backgroundColor: "#22C55E",
      value: registeredDevices,
    },
    {
      icon: BeerOff,
      label: "Unregistered",
      backgroundColor: "#A855F7",
      value: unregisteredDevices,
    },
  ];

  return (
    <View className="flex-1 flex-row bg-slate-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1 p-4"
      >
        <View className="gap-4">
          <View>
            <Text className="font-bold text-lg text-slate-900">
              Device Management
            </Text>
            <Text className="text-sm text-gray-600">
              Manage all POS devices and manage registered devices for your
              business.
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {deviceSummaryCards.map((item, index) => (
              <View
                key={index}
                className="w-full sm:w-[48%] lg:w-[31%] bg-white rounded-2xl p-5 mb-4 border border-slate-100 shadow-sm"
              >
                <View className="flex-row items-center gap-4">
                  <View
                    style={{ backgroundColor: item.backgroundColor }}
                    className="w-14 h-14 rounded-xl items-center justify-center"
                  >
                    <item.icon size={24} color="white" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-gray-500 text-sm">{item.label}</Text>
                    <Text className="text-2xl font-bold text-slate-900 mt-1">
                      {item.value}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="overflow-x-auto">
            <View className="flex-row items-center justify-between px-6 bg-gray-200 rounded-t-lg py-4">
              <Text className="font-semibold text-slate-700 flex-1">
                Device Name
              </Text>
              <Text className="font-semibold text-slate-700 flex-1">
                OS / Specs
              </Text>
              <Text className="font-semibold text-slate-700 flex-1">
                Company (Location)
              </Text>
              <Text className="font-semibold text-slate-700 flex-1">
                Created At
              </Text>
              <Text className="font-semibold text-slate-700 w-32 text-center">
                Status
              </Text>
              <Text className="font-semibold text-slate-700 w-24 text-center">
                Action
              </Text>
            </View>

            <View className="bg-white rounded-b-lg shadow-sm">
              {deviceListType && deviceListType.length > 0 ? (
                deviceListType.map((device, index) => (
                  <View
                    key={device.id || index}
                    className={`flex-row items-center justify-between px-6 py-4 border-b border-gray-200 ${
                      activeDevice?.id === device.id ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <MonitorSmartphone size={22} color="#2563EB" />
                      <Text
                        className="text-gray-700 font-medium"
                        numberOfLines={1}
                      >
                        {device.deviceName}
                      </Text>
                    </View>
                    <Text className="text-gray-600 flex-1" numberOfLines={1}>
                      {device.deviceOs}
                    </Text>
                    <Text className="text-gray-600 flex-1" numberOfLines={1}>
                      {device.company?.name || "No Company"} (
                      {device.company?.location || "N/A"})
                    </Text>

                    <Text className="text-gray-600 flex-1">
                      {device.createdAt
                        ? new Date(device.createdAt).toLocaleDateString()
                        : "N/A"}
                    </Text>

                    <View className="w-32 items-center">
                      <Text
                        className={`font-semibold text-xs px-2.5 py-1 rounded-lg ${
                          device.registrationStatus === "REGISTERED"
                            ? "text-green-700 bg-green-50 border border-green-200"
                            : "text-red-700 bg-red-50 border border-red-200"
                        }`}
                      >
                        {device.registrationStatus}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2 w-24 justify-center">
                      <TouchableOpacity
                        onPress={() => setActiveDevice(device)}
                        className="p-2 bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Eye size={18} color="#2563EB" />
                      </TouchableOpacity>

                      <TouchableOpacity className="p-2 bg-red-50 rounded-lg cursor-pointer">
                        <BeerOff size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View className="p-8 items-center">
                  <Text className="text-gray-400">
                    No active devices found.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {activeDevice && (
        <View className="w-96 border-l border-slate-200 bg-white shadow-xl h-full flex-col">
         
          <View className="flex-row items-center justify-between p-5">
            <View className="flex-row items-center gap-3">
              <View className="bg-slate-100 p-2.5 rounded-xl">
                <MonitorSmartphone size={24} color="#334155" />
              </View>
              <View>
                <Text
                  className="font-bold text-slate-900 text-base"
                  numberOfLines={1}
                >
                  {activeDevice.deviceName}
                </Text>
                <Text
                  className="text-xs text-slate-400 font-mono"
                  numberOfLines={1}
                >
                  ID: {activeDevice.deviceId}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setActiveDevice(null)}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
          >
       
            <View className="mt-6">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Device Information
              </Text>
              <View className="gap-y-1">
                <DetailRow
                  label="Device Name"
                  value={activeDevice.deviceName}
                />
                <DetailRow
                  label="Device Type"
                  value={
                    activeDevice.deviceOs?.includes("Tab")
                      ? "Tablet"
                      : "POS Terminal"
                  }
                />
                <DetailRow label="Device ID" value={activeDevice.deviceId} />
                <DetailRow
                  label="Status"
                  value={activeDevice.registrationStatus}
                  highlight
                />
                <DetailRow
                  label="Connected Since"
                  value={
                    activeDevice.createdAt
                      ? new Date(activeDevice.createdAt).toLocaleDateString()
                      : "N/A"
                  }
                />
              </View>
            </View>


            <View className="mt-8">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Assigned Company
              </Text>
              <View className="gap-y-1">
                <DetailRow
                  label="Company Name"
                  value={activeDevice.company?.name}
                />
                <DetailRow label="Code" value={activeDevice.company?.code} />
                <DetailRow label="Email" value={activeDevice.company?.email} />
                <DetailRow
                  label="Location"
                  value={activeDevice.company?.location}
                />
                <DetailRow label="Type" value={activeDevice.company?.type} />
              </View>
            </View>

        
            <View className="mt-8 mb-8 gap-3">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Actions
              </Text>


              <View className="flex-row gap-3">
                <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 border border-orange-200 bg-white py-3 px-4 rounded-xl active:bg-orange-50">
                  <LogOut size={16} color="#F97316" />
                  <Text className="text-orange-600 font-semibold text-sm">
                    Force Logout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 border border-blue-200 bg-white py-3 px-4 rounded-xl active:bg-blue-50">
                  <RefreshCw size={16} color="#2563EB" />
                  <Text className="text-blue-600 font-semibold text-sm">
                    Restart Device
                  </Text>
                </TouchableOpacity>
              </View>


              <TouchableOpacity className="w-full flex-row items-center justify-center gap-2 bg-red-500 py-3.5 rounded-xl active:bg-red-600 shadow-sm shadow-red-100">
                <Power size={16} color="white" />
                <Text className="text-white font-semibold text-sm">
                  Disable Device
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value?: string | null;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <View className="flex-row justify-between items-center py-1 ">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text
        className={`text-sm font-medium ${
          highlight
            ? "text-green-600 bg-green-100/60 px-2 py-0.5 rounded text-xs font-bold"
            : "text-slate-800"
        }`}
      >
        {value || "N/A"}
      </Text>
    </View>
  );
}
