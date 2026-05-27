import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceNavbar from '@/app/(tabs)/Services/ServiceNavbar'
import Services from '@/app/(tabs)/Services/Services'
import Bookings from '@/app/(tabs)/Services/Bookings'

export default function index() {
  return (
    <ScrollView>
        <ServiceNavbar />
        <View className=' max-w-[73%] px-4 gap-4'>
        <Services />
        <Bookings />
        </View>
    </ScrollView>
  )
}