import type { ShiftType } from "@/app/(owner)/workers/addWorker";
import type { EmployeeResponse } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FormState {
  profile: string;
  name: string;
  email: string;
  phone: string;
  salary: string;
  shift: ShiftType | "";
  roleId: string;
}

export default function UpdateEmployee() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const employeeId = Array.isArray(id) ? id[0] : id;
  const { getEmployeeById, updateEmployee } = useEmployee();
  const { rolesResponse, getRoles } = useRole();
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [form, setForm] = useState<FormState>({
    profile: "",
    name: "",
    email: "",
    phone: "",
    salary: "",
    shift: "",
    roleId: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }

      await getRoles();
      const data = await getEmployeeById(employeeId);
      if (data) {
        setEmployee(data);
        setForm({
          profile: data.profile ?? "",
          name: data.name,
          email: data.email,
          phone: data.phone,
          salary: String(data.salary || ""),
          shift: data.shift ?? "",
          roleId: data.role?.id ?? "",
        });
      }
      setLoading(false);
    };

    loadEmployee();
  }, [employeeId, getEmployeeById, getRoles]);

  const createInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const handleSave = async () => {
    if (!employeeId) return;

    if (!form.name || !form.email || !form.phone) {
      Alert.alert("Missing fields", "Name, email, and phone are required.");
      return;
    }

    await updateEmployee(employeeId, {
      profile: form.profile,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      salary: Number(form.salary) || 0,
      shift: form.shift || "DAY",
      roleId: form.roleId,
    } as any);

    router.back();
  };

  if (!employeeId) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 px-6">
        <Text className="text-base font-semibold text-slate-700">
          No employee selected.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-slate-500">Loading employee...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="px-6 py-5 bg-white border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-slate-900">
              Update employee
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Edit profile information and save changes.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-2xl bg-slate-100 p-3"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-6">
        <View className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-6">
          <View className="p-6 flex-row items-center gap-4">
            <View className="h-20 w-20 rounded-3xl bg-slate-100 items-center justify-center">
              {employee?.profile ? (
                <Image
                  source={{ uri: employee.profile }}
                  className="h-20 w-20 rounded-3xl"
                />
              ) : (
                <Text className="text-2xl font-black text-emerald-700">
                  {createInitials(employee?.name)}
                </Text>
              )}
            </View>
            <View>
              <Text className="text-xl font-black text-slate-900">
                {employee?.name}
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                {employee?.email}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-5">
          <View>
            <Text className="text-xs font-semibold text-slate-700 mb-2">
              Full name
            </Text>
            <TextInput
              className="border-b border-slate-200 py-2 text-base text-slate-900"
              value={form.name}
              onChangeText={(val) => setForm({ ...form, name: val })}
              placeholder="John Doe"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-slate-700 mb-2">
              Email address
            </Text>
            <TextInput
              className="border-b border-slate-200 py-2 text-base text-slate-900"
              value={form.email}
              onChangeText={(val) => setForm({ ...form, email: val })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="john@example.com"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-slate-700 mb-2">
              Phone number
            </Text>
            <TextInput
              className="border-b border-slate-200 py-2 text-base text-slate-900"
              value={form.phone}
              onChangeText={(val) => setForm({ ...form, phone: val })}
              keyboardType="phone-pad"
              placeholder="+250 788 000 000"
            />
          </View>

          <View className="grid grid-cols-2 gap-4">
            <View>
              <Text className="text-xs font-semibold text-slate-700 mb-2">
                Shift
              </Text>
              <View className="border border-slate-200 rounded-xl overflow-hidden">
                <Picker
                  selectedValue={form.shift}
                  onValueChange={(value) => setForm({ ...form, shift: value })}
                >
                  <Picker.Item label="Select shift" value="" />
                  <Picker.Item label="Day" value="DAY" />
                  <Picker.Item label="Evening" value="EVENING" />
                  <Picker.Item label="Night" value="NIGHT" />
                  <Picker.Item label="Hybrid" value="HYBRID" />
                </Picker>
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-700 mb-2">
                Salary (RWF)
              </Text>
              <TextInput
                className="border-b border-slate-200 py-2 text-base text-slate-900"
                value={form.salary}
                onChangeText={(val) => setForm({ ...form, salary: val })}
                keyboardType="numeric"
                placeholder="100000"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-semibold text-slate-700 mb-2">
              Role
            </Text>
            <View className="border border-slate-200 rounded-xl overflow-hidden">
              <Picker
                selectedValue={form.roleId}
                onValueChange={(value) => setForm({ ...form, roleId: value })}
              >
                <Picker.Item label="Choose role" value="" />
                {rolesResponse.map((role) => (
                  <Picker.Item
                    key={role.id}
                    label={role.name}
                    value={role.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            className="bg-green-700 py-4 rounded-3xl items-center"
          >
            <Text className="font-bold text-white text-base">Save changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
