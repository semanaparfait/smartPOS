import { View, Text } from 'react-native'
import React from 'react'

export default function CompanyProfile() {
  return (
    <View>
      <View className="p-4 bg-blue-700 rounded-lg">
        <View></View>
        <View>
            <Text className="text-white text-2xl font-bold">Company Name</Text>
        </View>
      </View>
    </View>
  )
}