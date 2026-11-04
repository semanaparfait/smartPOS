import {
  ChoiceChips,
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  SHIFT_OPTIONS,
  initials,
} from "@/components/forms/FormKit";
import PayFields, { isRiderRole } from "@/components/forms/PayFields";
import { brand } from "@/config/theme";
import type { EmployeeResponse, PayType, ShiftType } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { secureUrl } from "@/utils/imageUrl";
import { tr } from "@/i18n";
interface FormState {
  name: string;
  email: string;
  phone: string;
  salary: string;
  payType: PayType;
  perDelivery: string;
  shift: ShiftType | "";
  roleId: string;
}

export default function UpdateEmployee() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const employeeId = Array.isArray(id) ? id[0] : id;

  const { getEmployeeById, updateEmployee } = useEmployee();
  const { rolesResponse, getRoles } = useRole();

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    salary: "",
    payType: "MONTHLY",
    perDelivery: "",
    shift: "",
    roleId: "",
  });
  const [original, setOriginal] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }

      await getRoles();
      const data = await getEmployeeById(employeeId);
      if (data) {
        const loaded: FormState = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          salary: String(data.salary || ""),
          payType: data.payType ?? "MONTHLY",
          perDelivery: data.perDelivery ? String(Math.round(Number(data.perDelivery))) : "",
          shift: data.shift ?? "",
          roleId: data.role?.id ?? "",
        };
        setEmployee(data);
        setForm(loaded);
        setOriginal(loaded);
      }
      setLoading(false);
    };

    loadEmployee();
  }, [employeeId, getEmployeeById, getRoles]);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const isDirty = !!original && JSON.stringify(form) !== JSON.stringify(original);

  const handleSave = async () => {
    if (!employeeId) return;

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      Toast.show({
        type: "error",
        text1: tr("Missing fields"),
        text2: tr("Name, email and phone are required."),
      });
      return;
    }

    const perDelivery = isRiderRole(rolesResponse.find((r) => r.id === form.roleId)) && form.payType === "PER_DELIVERY";
    if (perDelivery && !(Number(form.perDelivery) > 0)) {
      Toast.show({ type: "error", text1: tr("Enter the pay per delivery"), text2: tr("Or choose a monthly salary.") });
      return;
    }

    setIsSaving(true);
    try {
      await updateEmployee(employeeId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        salary: perDelivery ? 0 : Number(form.salary) || 0,
        payType: perDelivery ? "PER_DELIVERY" : "MONTHLY",
        ...(perDelivery ? { perDelivery: Number(form.perDelivery) } : {}),
        shift: form.shift || "DAY",
        roleId: form.roleId,
      });
      Toast.show({ type: "success", text1: tr("Employee updated"), text2: `${form.name.trim()} saved.` });
      router.back();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: tr("Could not save"),
        text2: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!employeeId || loading || !employee) {
    return (
      <View className="flex-1 justify-center items-center bg-ivory px-6">
        {loading ? (
          <>
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">{tr("Loading employee...")}</Text>
          </>
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              <Ionicons name="person-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">
              {employeeId ? "Employee not found" : "No employee selected"}
            </Text>
            <Text onPress={() => router.back()} className="text-ink text-xs font-bold underline mt-2">{tr("Go back")}</Text>
          </>
        )}
      </View>
    );
  }

  const isWide = width >= 1100;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ivory"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow={tr("Team · Employees")}
          title={tr("Edit employee")}
          subtitle={tr("Update details and save your changes.")}
          onBack={() => router.back()}
        />

        {/* Summary */}
        <View className="flex-row items-center bg-ink rounded-2xl p-4">
          <View className="w-14 h-14 rounded-2xl bg-lime items-center justify-center overflow-hidden">
            {employee.profile ? (
              <Image source={{ uri: secureUrl(employee.profile) }} style={{ width: 56, height: 56 }} />
            ) : (
              <Text className="text-ink text-lg font-extrabold">{initials(employee.name)}</Text>
            )}
          </View>
          <View className="flex-1 ml-3.5">
            <Text numberOfLines={1} className="text-white text-base font-extrabold">
              {employee.name}
            </Text>
            <Text numberOfLines={1} className="text-white/50 text-xs mt-0.5">
              {employee.email}
            </Text>
          </View>
          {isDirty && (
            <View className="flex-row items-center bg-lime/15 rounded-full px-2.5 py-1">
              <View className="w-1.5 h-1.5 rounded-full bg-lime mr-1.5" />
              <Text className="text-lime text-[11px] font-bold">{tr("Unsaved changes")}</Text>
            </View>
          )}
        </View>

        <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
          <View className="flex-1">
            <Section icon="person-outline" title={tr("Personal details")}>
              <View style={{ gap: 18 }}>
                <View>
                  <Label required>{tr("Full name")}</Label>
                  <Input
                    icon="person-outline"
                    value={form.name}
                    placeholder={tr("John Doe")}
                    onChangeText={(val) => update({ name: val })}
                  />
                </View>
                <View>
                  <Label required>{tr("Email")}</Label>
                  <Input
                    icon="mail-outline"
                    value={form.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder={tr("john@example.com")}
                    onChangeText={(val) => update({ email: val })}
                  />
                </View>
                <View>
                  <Label required>{tr("Phone")}</Label>
                  <Input
                    icon="call-outline"
                    value={form.phone}
                    keyboardType="phone-pad"
                    placeholder="+250 788 000 000"
                    onChangeText={(val) => update({ phone: val })}
                  />
                </View>
              </View>
            </Section>
          </View>

          <View className="flex-1" style={{ gap: 16 }}>
            <Section icon="briefcase-outline" title={tr("Employment")}>
              <View style={{ gap: 18 }}>
                <View>
                  <Label>{tr("Role")}</Label>
                  <ChoiceChips
                    options={rolesResponse.map((r) => ({ value: r.id, label: r.name }))}
                    value={form.roleId}
                    onChange={(roleId) => update({ roleId })}
                  />
                </View>
                <View>
                  <Label>{tr("Shift")}</Label>
                  <ChoiceChips
                    options={SHIFT_OPTIONS}
                    value={form.shift}
                    onChange={(shift) => update({ shift })}
                  />
                </View>
                <PayFields
                  payType={form.payType}
                  salary={form.salary}
                  perDelivery={form.perDelivery}
                  canPerDelivery={isRiderRole(rolesResponse.find((r) => r.id === form.roleId))}
                  onChange={update}
                />
              </View>
            </Section>

            <View className="flex-row" style={{ gap: 12 }}>
              <SecondaryButton
                label={tr("Discard")}
                icon="arrow-undo-outline"
                disabled={!isDirty || isSaving}
                onPress={() => original && setForm(original)}
              />
              <PrimaryButton
                label={isDirty ? "Save changes" : "No changes"}
                busyLabel={tr("Saving...")}
                icon="checkmark-circle-outline"
                busy={isSaving}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
