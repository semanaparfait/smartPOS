import React, { useEffect, useState } from 'react'
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import useEmployee from '@/store/Employee/UseEmploye'
import useRole from '@/store/Employee/useRole'
import type { EmployeeResponse } from '@/store/Employee/EmployeeType'
import type { ShiftType } from '@/app/(owner)/workers/addWorker'

interface FormState {
  profile: string
  name: string
  email: string
  phone: string
  salary: string
  shift: ShiftType | ''
  roleId: string
}

export default function UpdateEmployee() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const employeeId = Array.isArray(id) ? id[0] : id
  
  const { getEmployeeById, updateEmployee } = useEmployee()
  const { rolesResponse, getRoles } = useRole()
  
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null)
  const [form, setForm] = useState<FormState>({
    profile: '',
    name: '',
    email: '',
    phone: '',
    salary: '',
    shift: '',
    roleId: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      await getRoles()
      const data = await getEmployeeById(employeeId)
      if (data) {
        setEmployee(data)
        setForm({
          profile: data.profile ?? '',
          name: data.name,
          email: data.email,
          phone: data.phone,
          salary: String(data.salary || ''),
          shift: data.shift ?? '',
          roleId: data.role?.id ?? '',
        })
      }
      setLoading(false)
    }

    loadEmployee()
  }, [employeeId, getEmployeeById, getRoles])

  const createInitials = (name?: string) => {
    if (!name) return 'NA'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }

  const handleSave = async () => {
    if (!employeeId) return

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      Alert.alert('Missing fields', 'Name, email, and phone are required.')
      return
    }

    await updateEmployee(employeeId, {
      profile: form.profile,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      salary: Number(form.salary) || 0,
      shift: form.shift || 'DAY',
      roleId: form.roleId,
    } as any)

    router.back()
  }

  if (!employeeId) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
        <Text className="text-base font-semibold text-slate-700 mt-2">No employee selected.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="text-slate-500 mt-3 font-medium">Loading employee details...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-slate-50"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header section */}
        <View className="px-6 pt-14 pb-5 bg-white border-b border-slate-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-black text-slate-900 tracking-tight">Update employee</Text>
              <Text className="text-sm text-slate-500 mt-1">Edit profile information and save changes.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-2xl bg-slate-100 p-3 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-6 space-y-6">
          {/* Header Card Profile Summary */}
          <View className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 flex-row items-center space-x-4">
            <View className="h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center overflow-hidden">
              {employee?.profile ? (
                <Image
                  source={{ uri: employee.profile }}
                  className="h-full w-full"
                />
              ) : (
                <Text className="text-xl font-black text-emerald-700">
                  {createInitials(employee?.name)}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                {employee?.name}
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={1}>
                {employee?.email}
              </Text>
            </View>
          </View>

          {/* Core Form Container */}
          <View className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 space-y-5">
            
            {/* Full Name field */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Full name</Text>
              <TextInput
                className="border-b border-slate-200 pb-2 text-base text-slate-900 font-medium focus:border-emerald-600"
                value={form.name}
                onChangeText={(val) => setForm({ ...form, name: val })}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Email field */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email address</Text>
              <TextInput
                className="border-b border-slate-200 pb-2 text-base text-slate-900 font-medium focus:border-emerald-600"
                value={form.email}
                onChangeText={(val) => setForm({ ...form, email: val })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="john@example.com"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Phone Number field */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Phone number</Text>
              <TextInput
                className="border-b border-slate-200 pb-2 text-base text-slate-900 font-medium focus:border-emerald-600"
                value={form.phone}
                onChangeText={(val) => setForm({ ...form, phone: val })}
                keyboardType="phone-pad"
                placeholder="+250 788 000 000"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Shift and Salary - Replaced broken Web CSS Grid layout */}
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Shift</Text>
                <View className="border border-slate-200 rounded-xl bg-slate-50/50 justify-center">
                  <Picker
                    selectedValue={form.shift}
                    onValueChange={(value) => setForm({ ...form, shift: value })}
                    dropdownIconColor="#475569"
                    style={{ height: Platform.OS === 'ios' ? undefined : 48 }}
                  >
                    <Picker.Item label="Select shift" value="" color="#94a3b8" />
                    <Picker.Item label="Day" value="DAY" />
                    <Picker.Item label="Evening" value="EVENING" />
                    <Picker.Item label="Night" value="NIGHT" />
                    <Picker.Item label="Hybrid" value="HYBRID" />
                  </Picker>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Salary (RWF)</Text>
                <TextInput
                  className="border-b border-slate-200 pb-2 text-base text-slate-900 font-medium focus:border-emerald-600 h-[48px]"
                  value={form.salary}
                  onChangeText={(val) => setForm({ ...form, salary: val })}
                  keyboardType="numeric"
                  placeholder="100000"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Role picker */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Role</Text>
              <View className="border border-slate-200 rounded-xl bg-slate-50/50 justify-center">
                <Picker
                  selectedValue={form.roleId}
                  onValueChange={(value) => setForm({ ...form, roleId: value })}
                  dropdownIconColor="#475569"
                  style={{ height: Platform.OS === 'ios' ? undefined : 48 }}
                >
                  <Picker.Item label="Choose role" value="" color="#94a3b8" />
                  {rolesResponse.map((role) => (
                    <Picker.Item key={role.id} label={role.name} value={role.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Save CTA */}
            <TouchableOpacity
              onPress={handleSave}
              className="bg-emerald-700 py-4 rounded-2xl items-center mt-4 shadow-sm active:bg-emerald-800"
            >
              <Text className="font-bold text-white text-base">Save changes</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}