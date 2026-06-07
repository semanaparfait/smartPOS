import AddRole from "@/app/(owner)/workers/AddRole";
import { ChevronRight, Pencil, Plus, Trash2, User } from "lucide-react-native";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export const roles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full access to all features and settings.",
    permissions: 25,
    users: 1,
    color: "#DC2626",
  },
  {
    id: 2,
    name: "Administrator",
    description: "Manage users, roles, and organization settings.",
    permissions: 20,
    users: 2,
    color: "#2563EB",
  },
  {
    id: 3,
    name: "Manager",
    description: "Manage employees, departments, and reports.",
    permissions: 15,
    users: 8,
    color: "#16A34A",
  },
  {
    id: 4,
    name: "HR Officer",
    description: "Manage employee records, attendance, and leave requests.",
    permissions: 12,
    users: 5,
    color: "#059669",
  },
  {
    id: 5,
    name: "Accountant",
    description: "Manage payroll, salaries, and financial reports.",
    permissions: 10,
    users: 3,
    color: "#7C3AED",
  },
  {
    id: 6,
    name: "Team Leader",
    description: "Supervise team members and assign tasks.",
    permissions: 8,
    users: 6,
    color: "#EA580C",
  },
  {
    id: 7,
    name: "Customer Support",
    description: "Handle customer inquiries and support tickets.",
    permissions: 6,
    users: 10,
    color: "#0891B2",
  },
  {
    id: 8,
    name: "Employee",
    description: "View profile and perform assigned tasks.",
    permissions: 4,
    users: 95,
    color: "#64748B",
  },
];
export default function ViewRole() {
  const [showAddRole, setShowAddRole] = useState(false);

  return (
    <View className="shadow rounded-lg p-4">
      <View className="mb-4 flex-row items-center gap-4 justify-between">
        <View>
          <Text className="text-lg font-bold text-green-600">
            Role Management
          </Text>
          <Text className="text-sm text-gray-600">
            Create and manage user roles and permissions.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddRole(true)}
          className="px-4 py-2 bg-green-600 rounded-lg"
        >
          <View className="flex-row items-center gap-2">
            <Plus size={16} color="white" />
            <Text className="text-white font-bold">Add Role</Text>
          </View>
        </TouchableOpacity>
      </View>
      {showAddRole ? (
        <AddRole onBack={() => setShowAddRole(false)} />
      ) : (
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <View className="bg-green-50/60 px-5 py-4 flex-row items-center border-b border-gray-100">
            <Text className="flex-1 font-semibold text-gray-700">
              Role Name
            </Text>
            <Text className="flex-1 font-semibold text-gray-700">
              Description
            </Text>
            <Text className="flex-1 font-semibold text-gray-700">
              Permissions
            </Text>
            <Text className="flex-1 font-semibold text-gray-700">Users</Text>
            <Text className="w-24 font-semibold text-gray-700 text-right pr-2">
              Actions
            </Text>
          </View>

          {roles.slice(0, 5).map((role, index) => (
            <View
              key={role.id}
              className={`flex-row items-center px-5 py-4 border-b border-gray-100 ${
                index === roles.slice(0, 5).length - 1 ? "border-b-0" : ""
              }`}
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View className="w-10 h-10 items-center justify-center rounded-full bg-green-50">
                  <User size={18} color="#16a34a" />
                </View>
                <Text className="text-gray-900 font-medium text-base">
                  {role.name}
                </Text>
              </View>

              <View className="flex-1 pr-2">
                <Text
                  className="text-gray-500 text-sm"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {role.description}
                </Text>
              </View>

              <View className="flex-1 items-start">
                <View className="bg-green-50 px-2.5 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-medium">
                    {role.permissions} Permissions
                  </Text>
                </View>
              </View>

              {/* Users */}
              <View className="flex-1">
                <Text className="text-gray-600 font-medium text-sm">
                  {role.users} Users
                </Text>
              </View>

              {/* Actions */}
              <View className="w-24 flex-row items-center justify-end gap-2">
                <TouchableOpacity className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <Pencil size={16} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2 bg-red-50 hover:bg-red-100 rounded-lg">
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View className="flex-row items-center justify-center py-4 border-t border-gray-100">
            <Text className="text-green-600 text-sm">View All Roles</Text>
            <ChevronRight size={16} color="#16a34a" />
          </View>
        </View>
      )}
    </View>
  );
}
