import {
  AvatarPicker,
  ChoiceChips,
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
} from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import {
  COMPANY_TYPES,
  type CompanyType,
  type CompanyUpdate,
  type PickedImage,
  type profile,
  type ProfileUpdate,
} from "@/store/Authentication/AuthTypes";
import useAuth from "@/store/Authentication/useAuth";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type PersonForm = {
  name: string;
  phone: string;
  email: string;
};

type CompanyForm = {
  name: string;
  type: CompanyType | "";
  email: string;
  phone_number: string;
  location: string;
};

const TYPE_OPTIONS = COMPANY_TYPES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));

const personFrom = (p: profile): PersonForm => ({
  name: p.name ?? "",
  phone: p.phone ?? "",
  email: p.email ?? "",
});

const companyFrom = (p: profile): CompanyForm => ({
  name: p.company?.name ?? "",
  type: (p.company?.type as CompanyType) ?? "",
  email: p.company?.email ?? "",
  phone_number: p.company?.phone_number ?? "",
  location: p.company?.location ?? "",
});

// Only the fields that changed, trimmed, so unchanged values aren't re-validated.
function changedFields<T extends Record<string, string>>(form: T, original: T) {
  const changes: Partial<T> = {};
  (Object.keys(form) as (keyof T)[]).forEach((key) => {
    const value = form[key].trim();
    if (value !== original[key].trim()) changes[key] = value as T[keyof T];
  });
  return changes;
}

export default function EditProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useAuth((state) => state.profile);
  const { fetchProfile, updateProfile, updateCompany } = useAuth();

  const [person, setPerson] = useState<PersonForm | null>(null);
  const [company, setCompany] = useState<CompanyForm | null>(null);
  const [picture, setPicture] = useState<PickedImage | null>(null);
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingPerson, setSavingPerson] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fill the forms once the profile arrives; saves reset them explicitly.
  useEffect(() => {
    if (!profile) return;
    setPerson((prev) => prev ?? personFrom(profile));
    setCompany((prev) => prev ?? companyFrom(profile));
  }, [profile]);

  if (!profile || !person || !company) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
        <Text className="text-ink/40 text-xs mt-3">Loading your details...</Text>
      </View>
    );
  }

  const originalPerson = personFrom(profile);
  const originalCompany = companyFrom(profile);
  const personChanges = changedFields(person, originalPerson);
  const companyChanges = changedFields(company, originalCompany);
  const personDirty = Object.keys(personChanges).length > 0 || !!picture;
  const companyDirty = Object.keys(companyChanges).length > 0 || !!logo;
  const emailChanged = personChanges.email !== undefined;

  const savePerson = async () => {
    if (!person.name.trim() || !person.phone.trim() || !person.email.trim()) {
      Toast.show({ type: "error", text1: "Missing fields", text2: "Name, phone and email are required." });
      return;
    }
    if (emailChanged && !currentPassword) {
      Toast.show({
        type: "error",
        text1: "Password needed",
        text2: "Enter your current password to change your email.",
      });
      return;
    }

    const changes: ProfileUpdate = { ...personChanges };
    if (emailChanged) changes.currentPassword = currentPassword;

    setSavingPerson(true);
    try {
      const saved = await updateProfile(changes, picture ?? undefined);
      setPerson(personFrom(saved));
      setPicture(null);
      setCurrentPassword("");
      Toast.show({ type: "success", text1: "Profile saved" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Could not save", text2: (error as Error).message });
    } finally {
      setSavingPerson(false);
    }
  };

  const saveCompany = async () => {
    if (
      !company.name.trim() ||
      !company.email.trim() ||
      !company.phone_number.trim() ||
      !company.location.trim()
    ) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Name, email, phone and address are required.",
      });
      return;
    }

    setSavingCompany(true);
    try {
      await updateCompany(companyChanges as CompanyUpdate, logo ?? undefined);
      const saved = useAuth.getState().profile;
      if (saved) setCompany(companyFrom(saved));
      setLogo(null);
      Toast.show({ type: "success", text1: "Company details saved" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Could not save", text2: (error as Error).message });
    } finally {
      setSavingCompany(false);
    }
  };

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
          eyebrow="Settings"
          title="Edit details"
          subtitle="Update your own profile and your business details."
          onBack={() => router.back()}
        />

        <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
          {/* Your profile */}
          <View className="flex-1" style={{ gap: 12 }}>
            <Section icon="person-outline" title="Your profile" subtitle="How you appear in the app">
              <View style={{ gap: 18 }}>
                <AvatarPicker
                  uri={picture?.uri ?? secureUrl(profile.picture?.thumbnailUrl) ?? ""}
                  name={person.name}
                  removable={false}
                  hint="Shown next to your name around the app."
                  onChange={(uri, file) => setPicture({ uri, file })}
                />
                <View>
                  <Label required>Full name</Label>
                  <Input
                    icon="person-outline"
                    value={person.name}
                    placeholder="John Doe"
                    onChangeText={(name) => setPerson({ ...person, name })}
                  />
                </View>
                <View>
                  <Label required>Phone</Label>
                  <Input
                    icon="call-outline"
                    value={person.phone}
                    keyboardType="phone-pad"
                    placeholder="+250 788 000 000"
                    onChangeText={(phone) => setPerson({ ...person, phone })}
                  />
                </View>
                <View>
                  <Label required>Email</Label>
                  <Input
                    icon="mail-outline"
                    value={person.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    onChangeText={(email) => setPerson({ ...person, email })}
                  />
                  <Text className="text-ink/40 text-[11px] mt-1.5">You sign in with this email.</Text>
                </View>
                {emailChanged && (
                  <View>
                    <Label required>Current password</Label>
                    <Input
                      icon="lock-closed-outline"
                      value={currentPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      placeholder="Needed to change your email"
                      onChangeText={setCurrentPassword}
                    />
                  </View>
                )}
              </View>
            </Section>

            <View className="flex-row" style={{ gap: 12 }}>
              <SecondaryButton
                label="Discard"
                icon="arrow-undo-outline"
                disabled={!personDirty || savingPerson}
                onPress={() => {
                  setPerson(originalPerson);
                  setPicture(null);
                  setCurrentPassword("");
                }}
              />
              <PrimaryButton
                label={personDirty ? "Save profile" : "No changes"}
                busyLabel="Saving..."
                icon="checkmark-circle-outline"
                busy={savingPerson}
                onPress={() => personDirty && savePerson()}
              />
            </View>
          </View>

          {/* Company */}
          <View className="flex-1" style={{ gap: 12 }}>
            {profile.company ? (
              <>
                <Section icon="business-outline" title="Company" subtitle="Seen by staff and on receipts">
                  <View style={{ gap: 18 }}>
                    <AvatarPicker
                      uri={logo?.uri ?? secureUrl(profile.company.logo) ?? ""}
                      name={company.name}
                      square
                      removable={false}
                      title={company.name}
                      hint="company hint or motal"
                      onChange={(uri, file) => setLogo({ uri, file })}
                    />
                    <View>
                      <Label required>Business name</Label>
                      <Input
                        icon="storefront-outline"
                        value={company.name}
                        placeholder="My Restaurant"
                        onChangeText={(name) => setCompany({ ...company, name })}
                      />
                    </View>
                    <View>
                      <Label required>Type of business</Label>
                      <ChoiceChips
                        options={TYPE_OPTIONS}
                        value={company.type}
                        onChange={(type) => setCompany({ ...company, type })}
                      />
                    </View>
                    <View>
                      <Label required>Business email</Label>
                      <Input
                        icon="mail-outline"
                        value={company.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="hello@business.com"
                        onChangeText={(email) => setCompany({ ...company, email })}
                      />
                    </View>
                    <View>
                      <Label required>Business phone</Label>
                      <Input
                        icon="call-outline"
                        value={company.phone_number}
                        keyboardType="phone-pad"
                        placeholder="+250 788 000 000"
                        onChangeText={(phone_number) => setCompany({ ...company, phone_number })}
                      />
                    </View>
                    <View>
                      <Label required>Address</Label>
                      <Input
                        icon="location-outline"
                        value={company.location}
                        placeholder="KN 4 Ave, Kigali"
                        onChangeText={(location) => setCompany({ ...company, location })}
                      />
                    </View>
                    <View className="flex-row items-center pt-3 border-t border-ink/5">
                      <Ionicons name="key-outline" size={14} color={brand.inkMuted} />
                      <Text className="text-ink/50 text-xs ml-2 flex-1">
                        Company code {profile.company.code} can't be changed.
                      </Text>
                    </View>
                  </View>
                </Section>

                <View className="flex-row" style={{ gap: 12 }}>
                  <SecondaryButton
                    label="Discard"
                    icon="arrow-undo-outline"
                    disabled={!companyDirty || savingCompany}
                    onPress={() => {
                      setCompany(originalCompany);
                      setLogo(null);
                    }}
                  />
                  <PrimaryButton
                    label={companyDirty ? "Save company" : "No changes"}
                    busyLabel="Saving..."
                    icon="checkmark-circle-outline"
                    busy={savingCompany}
                    onPress={() => companyDirty && saveCompany()}
                  />
                </View>
              </>
            ) : (
              <Section icon="business-outline" title="Company">
                <Text className="text-ink/50 text-[13px]">No company is linked to this account.</Text>
              </Section>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
