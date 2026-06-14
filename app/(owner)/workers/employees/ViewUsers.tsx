import AddWorker from "@/app/(owner)/workers/employees/addWorker";
import useEmployee from "@/store/Employee/UseEmploye";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ViewUsers() {
  const [showAddWorker, setShowAddWorker] = useState(false);
  const { employeeResponses, getEmployees, DeleteEmployee, updateEmployee } =
    useEmployee();
  const router = useRouter();
  useEffect(() => {
    const fetchEmployees = async () => {
      await getEmployees();
    };
    fetchEmployees();
  }, []);

  return (
    <View className="shadow rounded-lg p-4 my-5">
      {showAddWorker ? (
        <AddWorker onBack={() => setShowAddWorker(false)} />
      ) : (
        <View>
          <View className="mb-4 flex-row items-center gap-4 justify-between">
            <View>
              <Text className="text-lg font-bold text-green-600">
                Employee Management
              </Text>
              <Text className="text-sm text-gray-600">
                View and manage all employees in your store.
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="bg-white flex-row items-center px-4 py-2 rounded-xl border border-slate-200 ">
                <Search size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Search worker name..."
                  className="flex-1 ml-3 text-base outline-none"
                />
              </View>
              <TouchableOpacity
                onPress={() => setShowAddWorker(true)}
                className="px-4 py-2 bg-green-600 rounded-lg"
              >
                <View className="flex-row items-center gap-2">
                  <Plus size={16} color="white" />
                  <Text className="text-white font-bold">Add Employee</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="min-w-[900px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <View className="bg-green-50/60 px-5 py-3 flex-row items-center border-b border-gray-100">
                  <Text className="w-12 font-semibold text-gray-700">#</Text>
                  <Text className="w-16 font-semibold text-gray-700">
                    Image
                  </Text>
                  <Text className="w-64 font-semibold text-gray-700">
                    Full Name
                  </Text>
                  <Text className="w-56 font-semibold text-gray-700">
                    Email
                  </Text>
                  <Text className="w-36 font-semibold text-gray-700">
                    Phone
                  </Text>
                  <Text className="w-36 font-semibold text-gray-700">
                    Joining
                  </Text>
                  <Text className="w-44 font-semibold text-gray-700">
                    Salary
                  </Text>
                  <Text className="w-36 font-semibold text-gray-700">
                    Payment
                  </Text>
                  <Text className="w-28 font-semibold text-gray-700">Role</Text>
                  <Text className="w-24 font-semibold text-gray-700 text-right pr-2">
                    Actions
                  </Text>
                </View>
                {/* Table Body */}
                {employeeResponses.slice(0, 5).map((worker, index) => (
                  <View
                    key={worker.id}
                    className={`flex-row items-center px-5 py-4 border-b border-gray-100 ${
                      index === employeeResponses.length - 1 ? "border-b-0" : ""
                    } ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <View className="w-12">
                      <Text className="text-gray-900 font-medium text-base">
                        {index + 1}
                      </Text>
                    </View>
                    <View className="w-16 flex-row items-center gap-3">
                      {worker.profile ? (
                        <Image
                          source={{ uri: worker.profile }}
                          className="w-11 h-11 rounded-full bg-gray-100"
                        />
                      ) : (
                        <View
                          style={{ backgroundColor: "#d1fae5" }}
                          className="w-11 h-11 rounded-full items-center justify-center"
                        >
                          <Text className="text-emerald-700 font-semibold text-lg">
                            {(worker.name || "")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="w-64">
                      <Text
                        className="text-gray-900 font-semibold text-base"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {worker.name}
                      </Text>
                    </View>

                    <View className="w-56">
                      <Text
                        className="text-gray-500 text-sm"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {worker.email}
                      </Text>
                    </View>

                    <View className="w-36">
                      <Text className="text-gray-500 text-sm">
                        {worker.phone}
                      </Text>
                    </View>

                    <View className="w-36">
                      <Text className="text-gray-500 text-sm">
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View className="w-44">
                      <Text className="text-green-700 text-sm font-medium ">
                        {new Intl.NumberFormat().format(worker.salary)} RWF
                      </Text>
                    </View>

                    <View className="w-36">
                      <Text className="text-gray-500 text-sm">
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View className="w-24">
                      <View className="px-2 py-1 rounded-lg bg-green-100 items-center justify-center">
                        <Text className="text-xs text-green-700">
                          {worker.role.name}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons Panel */}
                    <View className="w-24 flex-row items-center justify-end gap-2 ml-3">
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/workers/employees/[id]",
                            params: { id: worker.id },
                          })
                        }
                        className="p-2 bg-gray-50 active:bg-gray-100 rounded-lg"
                      >
                        <Eye size={15} color="#4b5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/workers/employees/UpdateEmployee",
                            params: { id: worker.id },
                          })
                        }
                        className="p-2 bg-gray-50 active:bg-gray-100 rounded-lg"
                      >
                        <Pencil size={15} color="#4b5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          DeleteEmployee(worker.id);
                          //  console.log(`trying to delete ${worker.id}`)
                        }}
                        className="p-2 bg-red-50 active:bg-red-100 rounded-lg"
                      >
                        <Trash2 size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer View Toggle Link */}
            <TouchableOpacity className="flex-row items-center justify-center py-4 border-t border-gray-100 active:bg-gray-50/50">
              <Text className="text-green-600 font-semibold text-sm mr-1">
                View Full Directory
              </Text>
              <ChevronRight size={16} color="#16a34a" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
