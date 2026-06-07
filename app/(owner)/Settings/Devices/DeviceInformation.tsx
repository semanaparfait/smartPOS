import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import useDeviceInfo from '@/store/Device/useDeviceInfo'
import { Tablet,GlobeCheck,GlobeX,BeerOff } from 'lucide-react-native';

export default function DeviceInformation() {
  const { getDevices } = useDeviceInfo();
  const deviceInfo = useDeviceInfo((state) => state.devicesList);

  useEffect(() => {
    getDevices();
  }, []);

  const deviceaDet = [
    {
      icon: Tablet,
      label: "Total Devices",
      backgroundColor: "#2563EB",
      value: deviceInfo?.length,
    },
    {
      icon: GlobeCheck,
      label: "Online Devices",
      backgroundColor: "#22C55E",
      value:  "0",
    },
    {
      icon: GlobeX,
      label: "Offline Devices",
      backgroundColor: "#F97316",
      value: "0",
    },
    {
      icon: BeerOff,
      label: "Unregistered ",
      backgroundColor: "#A855F7",
      value: "0",
    }
  ]
  return (
    <View className='flex-1 p-4 gap-4'>
      <View>
        <Text className='font-bold text-lg'>Device Management</Text>
        <Text className='text-sm text-gray-600'>Manage all POS devices and manage registered devices for your business.</Text>
      </View>
      <View className='flex-row flex-wrap gap-4'>
        {deviceaDet.map((item, index) => (
          <View key={index} className={`w-48 p-4 rounded-lg shadow `}>
            <View className='flex-row items-center justify-between mb-2 gap-4'>
              <View
               style={{ backgroundColor: item.backgroundColor }} 
               className={`p-2 rounded-lg`}>
              <item.icon size={20} color="white" />
              </View>
              <View>
              <Text className='text-sm text-gray-500'>{item.label}</Text>
            <Text className='text-2xl font-bold text-gray-900'>{item.value}</Text>
            </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}