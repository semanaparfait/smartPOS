import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import useEmployee from "@/store/Employee/UseEmploye";
import type { EmployeeResponse } from "@/store/Employee/EmployeeType";

export default function SingleWorker() {
  const router = useRouter();
  const { getEmployeeById } = useEmployee();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const employeeId = Array.isArray(id) ? id[0] : id;
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      setLoading(true);
      const employee = await getEmployeeById(employeeId);
      setEmployee(employee);
      setLoading(false);
    };

    fetchEmployee();
  }, [employeeId, getEmployeeById]);

  const createInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!employeeId) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
        <Text className="text-sm font-medium text-slate-500 mt-3">
          No worker ID provided.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="small" color="#0f172a" />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Ionicons name="person-remove-outline" size={40} color="#94a3b8" />
        <Text className="text-sm font-medium text-slate-500 mt-3">
          Worker profile not found.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Top Header Navigation */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-3 border-b border-slate-100 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.6}
          className="p-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <Ionicons name="chevron-back" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-slate-900">Worker Profile</Text>
        <View className="w-8 flex-row justify-end">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View className="bg-white rounded-2xl border border-slate-200/60 p-6 items-center mb-4 shadow-sm shadow-slate-100/40">
          <View className="h-20 w-20 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center mb-3">
            <Text className="text-2xl font-semibold text-slate-700 tracking-wide">
              {createInitials(employee.name)}
            </Text>
          </View>

          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            {employee.name}
          </Text>
          <Text className="text-xs font-medium text-slate-400 mt-0.5">
            {employee.email}
          </Text>

          {/* Actionable Tags */}
          <View className="mt-3.5 flex-row justify-center gap-1.5">
            <View className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                {employee.shift} SHIFT
              </Text>
            </View>
            <View className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                {employee.role.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Groupings */}
        <View className="gap-3.5">
          
          {/* Section: Employee Work Assignment */}
          <View className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-sm shadow-slate-100/40">
            <View className="flex-row items-center gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
              <Ionicons name="ribbon-outline" size={15} color="#64748b" />
              <Text className="text-[11px] uppercase tracking-[1px] text-slate-400 font-bold">
                Role & Assignment
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Designation</Text>
              <Text className="text-xs font-semibold text-slate-900 capitalize">{employee.role.name}</Text>
            </View>
            <View className="flex-row justify-between items-start py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Responsibility</Text>
              <Text className="text-xs font-medium text-slate-700 max-w-[65%] text-right capitalize">
                {employee.role.description}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5 border-t border-slate-50 mt-1 pt-1.5">
              <Text className="text-xs text-slate-400 font-medium">System ID</Text>
              <Text className="text-xs font-mono text-slate-400 select-all">{employee.id.slice(0, 13)}...</Text>
            </View>
          </View>

          {/* Section: Personal Contact Details */}
          <View className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-sm shadow-slate-100/40">
            <View className="flex-row items-center gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
              <Ionicons name="phone-portrait-outline" size={15} color="#64748b" />
              <Text className="text-[11px] uppercase tracking-[1px] text-slate-400 font-bold">
                Contact Details
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Personal Phone</Text>
              <Text className="text-xs font-semibold text-slate-900">{employee.phone}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Date Registered</Text>
              <Text className="text-xs font-semibold text-slate-900">{formatDate(employee.createdAt)}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Last Update</Text>
              <Text className="text-xs font-semibold text-slate-900">{formatDate(employee.updatedAt)}</Text>
            </View>
          </View>

          {/* Section: Corporate Context */}
          <View className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-sm shadow-slate-100/40">
            <View className="flex-row items-center gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
              <Ionicons name="business-outline" size={15} color="#64748b" />
              <Text className="text-[11px] uppercase tracking-[1px] text-slate-400 font-bold">
                Company Details
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Employer</Text>
              <Text className="text-xs font-semibold text-slate-900">{employee.company.name}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Business Code</Text>
              <Text className="text-xs font-mono font-medium text-slate-600 tracking-wide">{employee.company.code}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Industry Segment</Text>
              <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{employee.company.type}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Workplace Office</Text>
              <Text className="text-xs font-semibold text-slate-900">{employee.company.location}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5 border-t border-slate-50 mt-1 pt-1.5">
              <Text className="text-xs text-slate-400 font-medium">Corporate Email</Text>
              <Text className="text-xs font-medium text-slate-600">{employee.company.email}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1.5">
              <Text className="text-xs text-slate-400 font-medium">Switchboard</Text>
              <Text className="text-xs font-medium text-slate-600">{employee.company.phone_number}</Text>
            </View>
          </View>

          {/* Section: Financial Compensations */}
          <View className="rounded-xl bg-white border border-slate-200/60 p-5 shadow-sm shadow-slate-100/40">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="wallet-outline" size={15} color="#64748b" />
                <Text className="text-[11px] uppercase tracking-[1px] text-slate-400 font-bold">
                  Compensation Model
                </Text>
              </View>
              <Ionicons name="trending-up" size={14} color="#94a3b8" />
            </View>
            <View className="flex-row justify-between items-end py-1">
              <Text className="text-xs text-slate-400 font-medium pb-0.5">Salary</Text>
              <View className="items-end">
                <Text className="text-lg font-bold text-slate-900 tracking-tight">
                  {employee.salary?.toLocaleString()} RWF
                </Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Gross / Month
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}