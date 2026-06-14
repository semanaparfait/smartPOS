import AddRole from "@/app/(owner)/workers/roles/AddRole";
import { ChevronRight, Pencil, Plus, Trash2, User } from "lucide-react-native";
import React, { useEffect, useState,  } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import useRole from "@/store/Employee/useRole";
import { useRouter } from "expo-router";



export default function ViewRole() {
  const [showAddRole, setShowAddRole] = useState(false);
  const { rolesResponse, getRoles, updateRole } = useRole();
  const router = useRouter();
useEffect(() => {
  const fetchRoles = async () => {
    await getRoles();
  };

  fetchRoles();
}, []);
console.log("rolesResponse:", rolesResponse);
console.log("type:", typeof rolesResponse);

  return (
    <View className="shadow rounded-lg p-4 ">
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[900px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
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

          {rolesResponse.slice(0, 5).map((role) => (
            <View
              key={role.id}
              className={`flex-row items-center px-5 py-4 border-b border-gray-100 ${
                rolesResponse.slice(0, 5).indexOf(role) === rolesResponse.slice(0, 5).length - 1 ? "border-b-0" : ""
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
                    {/* {role.permissions} Permissions */}
                    permissions
                  </Text>
                </View>
              </View>

              {/* Users */}
              <View className="flex-1">
                <Text className="text-gray-600 font-medium text-sm">
                  {/* {role.users} Users */}
                  users
                </Text>
              </View>

              {/* Actions */}
              <View className="w-24 flex-row items-center justify-end gap-2">
                <TouchableOpacity
                  onPress={() => 
                    router.push({
                      pathname: "/(owner)/workers/roles/UpdateRole",
                      params: { id: role.id }
                    })
                  }
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg"
                >
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
        </ScrollView>
      )}
    </View>
  );
}
