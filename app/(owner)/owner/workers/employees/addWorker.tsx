import {
  AvatarPicker,
  ChoiceChips,
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  Section,
  SHIFT_OPTIONS,
  initials,
} from "@/components/forms/FormKit";
import PayFields, { isRiderRole } from "@/components/forms/PayFields";
import { brand } from "@/config/theme";
import type { PayType, ShiftType } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { playBeep } from "@/utils/beep";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { secureUrl } from "@/utils/imageUrl";
import { tr } from "@/i18n";
interface AddWorkerProps {
  onBack?: () => void;
  // Chosen already, e.g. the Delivery rider role from delivery settings.
  presetRoleId?: string;
}

interface RegistrationDetails {
  name: string;
  email: string;
  profile: string;
  pin: string;
  password: string;
}

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const emptyForm = {
  profile: "",
  profileFile: null as Blob | null,
  name: "",
  email: "",
  phoneNumber: "",
  salary: "",
  payType: "MONTHLY" as PayType,
  perDelivery: "",
  role: "",
  shift: "" as ShiftType | "",
};

function CredentialRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-white/10">
      <Text className="text-white/50 text-xs font-semibold">{label}</Text>
      <Text
        selectable
        numberOfLines={1}
        className={`text-[15px] font-bold ml-4 flex-shrink ${secret ? "text-lime" : "text-white"}`}
        style={secret ? { fontFamily: MONO, letterSpacing: 1.5 } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

export default function AddWorker({ onBack, presetRoleId }: AddWorkerProps) {
  const [form, setForm] = useState({ ...emptyForm, role: presetRoleId ?? "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationDetails, setRegistrationDetails] =
    useState<RegistrationDetails | null>(null);
  const { addEmployee } = useEmployee();
  const { rolesResponse, getRoles } = useRole();
  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchRoles = async () => {
      await getRoles();
    };
    fetchRoles();
  }, []);

  const isWide = width >= 1100;
  const chosenRole = rolesResponse.find((r) => r.id === form.role);
  const update = (patch: Partial<typeof emptyForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      Toast.show({
        type: "error",
        text1: tr("Missing information"),
        text2: tr("Please provide name, email and phone number."),
      });
      return;
    }
    if (!form.role) {
      Toast.show({ type: "error", text1: tr("Choose a role"), text2: tr("Every employee needs a role.") });
      return;
    }
    const perDelivery = isRiderRole(chosenRole) && form.payType === "PER_DELIVERY";
    if (perDelivery && !(Number(form.perDelivery) > 0)) {
      Toast.show({ type: "error", text1: tr("Enter the pay per delivery"), text2: tr("Or choose a monthly salary.") });
      return;
    }
    if (!form.profile) {
      Toast.show({ type: "error", text1: tr("Missing photo"), text2: tr("Please select a profile photo.") });
      return;
    }
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("phone", form.phoneNumber.trim());
      formData.append("salary", perDelivery ? "0" : String(Number(form.salary) || 0));
      formData.append("payType", perDelivery ? "PER_DELIVERY" : "MONTHLY");
      if (perDelivery) formData.append("perDelivery", String(Number(form.perDelivery)));
      formData.append("shift", form.shift || "DAY");
      formData.append("roleId", form.role);
      if (Platform.OS === "web") {
        let picture: Blob;
        if (form.profileFile) {
          picture = form.profileFile;
        } else {
          picture = await fetch(form.profile).then((response) => response.blob());
        }
        formData.append("picture", picture, "employee.jpg");
      } else {
        formData.append("picture", {
          uri: form.profile,
          name: "employee.jpg",
          type: "image/jpeg",
        } as any);
      }

      const response = await addEmployee(formData);
      const responseData = response.data as Record<string, unknown> | undefined;
      const responseCredentials = response.credentials as Record<string, unknown> | undefined;
      const dataCredentials = responseData?.credentials as Record<string, unknown> | undefined;
      const getResponseValue = (keys: string[]) => {
        for (const key of keys) {
          const value =
            response[key] ??
            responseData?.[key] ??
            responseCredentials?.[key] ??
            dataCredentials?.[key];
          if (value !== undefined && value !== null) return String(value);
        }
        return "Not provided";
      };

      setRegistrationDetails({
        name: form.name.trim(),
        email: form.email.trim(),
        profile: form.profile,
        pin: getResponseValue(["pin", "pinCode", "generatedPin"]),
        password: getResponseValue(["password", "temporaryPassword", "generatedPassword"]),
      });

      await playBeep();
    } catch (error: any) {
      console.error("Add Employee Error:", error);
      Toast.show({
        type: "error",
        text1: tr("Registration failed"),
        text2: error.message || "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finish = () => {
    setRegistrationDetails(null);
    setForm(emptyForm);
    onBack?.();
  };

  const personal = (
    <Section icon="person-outline" title={tr("Personal details")}>
      <View style={{ gap: 18 }}>
        <AvatarPicker
          uri={form.profile}
          name={form.name}
          onChange={(uri, file) => update({ profile: uri, profileFile: file })}
        />
        <View>
          <Label required>{tr("Full name")}</Label>
          <Input
            icon="person-outline"
            value={form.name}
            placeholder={tr("e.g. Semana shema parfait")}
            onChangeText={(val) => update({ name: val })}
          />
        </View>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <View className="flex-1 min-w-[220px]">
            <Label required>{tr("Email")}</Label>
            <Input
              icon="mail-outline"
              value={form.email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={tr("semana@example.com")}
              onChangeText={(val) => update({ email: val })}
            />
          </View>
          <View className="flex-1 min-w-[180px]">
            <Label required>{tr("Phone")}</Label>
            <Input
              icon="call-outline"
              value={form.phoneNumber}
              keyboardType="phone-pad"
              placeholder={tr("+250 7XX XXX XXX")}
              onChangeText={(val) => update({ phoneNumber: val })}
            />
          </View>
        </View>
      </View>
    </Section>
  );

  const employment = (
    <Section icon="briefcase-outline" title={tr("Employment")}>
      <View style={{ gap: 18 }}>
        <View>
          <Label required>{tr("Role")}</Label>
          {rolesResponse.length === 0 ? (
            <View className="flex-row items-center bg-ivory rounded-xl px-3.5 h-12">
              <Ionicons name="information-circle-outline" size={16} color={brand.inkMuted} />
              <Text className="text-ink/50 text-xs ml-2">{tr("No roles yet — create one first.")}</Text>
            </View>
          ) : (
            <ChoiceChips
              options={rolesResponse.map((r) => ({ value: r.id, label: r.name }))}
              value={form.role}
              onChange={(role) => update({ role })}
            />
          )}
        </View>
        <View>
          <Label>{tr("Shift")}</Label>
          <ChoiceChips options={SHIFT_OPTIONS} value={form.shift} onChange={(shift) => update({ shift })} />
          {!form.shift && (
            <Text className="text-ink/40 text-[11px] mt-1.5">{tr("Defaults to Day if not chosen.")}</Text>
          )}
        </View>
        <PayFields
          payType={form.payType}
          salary={form.salary}
          perDelivery={form.perDelivery}
          canPerDelivery={isRiderRole(chosenRole)}
          onChange={update}
        />
      </View>
    </Section>
  );

  return (
    <View style={{ gap: 16 }}>
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        <View className="flex-1">{personal}</View>
        <View className="flex-1" style={{ gap: 16 }}>
          {employment}

          <View className="flex-row items-start bg-ink rounded-2xl p-4">
            <View className="w-9 h-9 rounded-xl bg-lime items-center justify-center">
              <Ionicons name="key-outline" size={17} color={brand.ink} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-[13px] font-bold">{tr("Login details are generated for you")}</Text>
              <Text className="text-white/50 text-xs mt-0.5 leading-4">{tr("After saving you will see a PIN and password once — share them with the employee.")}</Text>
            </View>
          </View>

          <View className="flex-row" style={{ gap: 12 }}>
            <SecondaryButton
              label={tr("Reset")}
              icon="refresh"
              disabled={isSubmitting}
              onPress={() => setForm({ ...emptyForm, role: presetRoleId ?? "" })}
            />
            <PrimaryButton
              label={tr("Register employee")}
              busyLabel={tr("Registering...")}
              icon="person-add-outline"
              busy={isSubmitting}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>

      {/* Credentials — shown once */}
      <Modal visible={registrationDetails !== null} transparent animationType="fade" onRequestClose={finish}>
        <View className="flex-1 bg-ink/60 justify-center items-center px-6">
          <View className="w-full max-w-md bg-ink rounded-3xl overflow-hidden">
            <View className="items-center px-6 pt-7 pb-5">
              <View className="w-20 h-20 rounded-full bg-lime items-center justify-center overflow-hidden mb-3">
                {registrationDetails?.profile ? (
                  <Image source={{ uri: secureUrl(registrationDetails.profile) }} style={{ width: 80, height: 80 }} />
                ) : (
                  <Text className="text-ink text-2xl font-extrabold">
                    {initials(registrationDetails?.name)}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center bg-lime/15 rounded-full px-3 py-1 mb-2">
                <Ionicons name="checkmark-circle" size={14} color={brand.lime} />
                <Text className="text-lime text-xs font-bold ml-1">{tr("Employee registered")}</Text>
              </View>
              <Text className="text-white text-xl font-extrabold tracking-tight">
                {registrationDetails?.name}
              </Text>
              <Text className="text-white/50 text-xs mt-0.5">{registrationDetails?.email}</Text>
            </View>

            <View className="mx-5 px-4 rounded-2xl bg-white/5 border border-white/10">
              <CredentialRow label="PIN" value={registrationDetails?.pin ?? ""} secret />
              <CredentialRow label={tr("Password")} value={registrationDetails?.password ?? ""} secret />
            </View>

            <View className="flex-row items-start mx-5 mt-4">
              <Ionicons name="warning-outline" size={14} color={brand.lime} />
              <Text className="flex-1 text-white/60 text-[11px] ml-1.5 leading-4">{tr("These are shown only now. Write them down or share them with the employee before closing.")}</Text>
            </View>

            <Pressable
              onPress={finish}
              className="m-5 h-12 rounded-xl bg-lime items-center justify-center active:bg-lime-dark"
            >
              <Text className="text-ink text-[15px] font-bold">{tr("Done")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
