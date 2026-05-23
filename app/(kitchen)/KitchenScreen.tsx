import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import NewOrder from './NewOrders/NewOrder'
import Preparing from './Preparing/Preparing'
import Ready from './Ready/Ready'
import Served from './Served/Served'

export default function KitchenScreen() {
  return (
    <SafeAreaView>
      <View className='flex-row'>
        <NewOrder />
        <Preparing />
        <Ready />
        <Served />
      </View>
    </SafeAreaView>
  )
}