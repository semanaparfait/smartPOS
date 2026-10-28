import {
  initials,
  Input,
  Label,
  pickSquarePhoto,
  PrimaryButton,
  SecondaryButton,
  Section,
} from "@/app/components/ownerComponents/FormKit";
import { ErrorNote, ProfilePage } from "@/components/profile/profileKit";
import { brand } from "@/config/theme";
import type { PickedImage } from "@/store/Authentication/AuthTypes";
import useAuth from "@/store/Authentication/useAuth";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import Toast from "react-native-toast-message";

const capitalize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

function PreviewLine({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View className="flex-row items-center py-2.5">
      <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
        <Ionicons name={icon} size={15} color={brand.ink} />
      </View>
      <Text numberOfLines={1} className="flex-1 text-ink text-[13px] font-medium ml-3">
        {value || "—"}
      </Text>
    </View>
  );
}

export default function EditStaffProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useAuth((state) => state.profile);
  const { updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [picture, setPicture] = useState<PickedImage | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once the profile is available.
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile?.id]);

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
        <Text className="text-ink/40 text-xs mt-3">Loading your profile...</Text>
      </View>
    );
  }

  const nameChanged = name.trim() !== (profile.name ?? "");
  const phoneChanged = phone.trim() !== (profile.phone ?? "");
  const dirty = nameChanged || phoneChanged || !!picture;

  const photoUri = picture?.uri ?? secureUrl(profile.picture);
  const showPhoto = !!photoUri && !photoFailed;
  const displayName = name.trim() || profile.name || "Your name";
  const role = capitalize(profile.role) || "Staff";
  const isWide = width >= 900;
  const isEmployee = profile.role === "EMPLOYEE";

  const choosePhoto = async () => {
    const photo = await pickSquarePhoto();
    if (photo) {
      setPhotoFailed(false);
      setPicture(photo);
    }
  };

  const discard = () => {
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
    setPicture(null);
    setPhotoFailed(false);
    setError(null);
  };

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProfile(
        {
          ...(nameChanged ? { name: name.trim() } : {}),
          ...(phoneChanged ? { phone: phone.trim() } : {}),
        },
        picture ?? undefined,
      );
      Toast.show({ type: "success", text1: "Profile saved", text2: "Your changes are live." });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const preview = (
    <View className="bg-white rounded-3xl border border-ink/5 overflow-hidden">
      {/* Cover */}
      <View className="bg-ink px-6 pt-6 pb-16 overflow-hidden">
        <View
          className="absolute rounded-full bg-lime/10"
          style={{ width: 220, height: 220, right: -70, top: -110 }}
        />
        <View
          className="absolute rounded-full bg-lime/5"
          style={{ width: 140, height: 140, left: -50, bottom: -80 }}
        />
        <View className="flex-row items-center justify-between">
          <Text className="text-white/50 text-[10px] font-bold uppercase tracking-[2px]">
            Live preview
          </Text>
          {dirty && (
            <View className="flex-row items-center bg-lime/15 rounded-full px-2.5 py-1">
              <View className="w-1.5 h-1.5 rounded-full bg-lime mr-1.5" />
              <Text className="text-lime text-[11px] font-semibold">Unsaved</Text>
            </View>
          )}
        </View>
      </View>

      {/* Photo overlapping the cover */}
      <View className="items-center -mt-14 px-6">
        <Pressable
          onPress={choosePhoto}
          accessibilityRole="button"
          accessibilityLabel={showPhoto ? "Change photo" : "Add photo"}
          className="active:opacity-90"
        >
          <View className="w-28 h-28 rounded-3xl bg-ivory border-4 border-white items-center justify-center overflow-hidden">
            {showPhoto ? (
              <Image
                source={{ uri: photoUri }}
                style={{ width: 112, height: 112 }}
                resizeMode="cover"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <Text className="text-ink/40 text-3xl font-bold">{initials(displayName)}</Text>
            )}
          </View>
          <View className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-lime items-center justify-center border-4 border-white">
            <Ionicons name="camera" size={14} color={brand.ink} />
          </View>
        </Pressable>

        <Text numberOfLines={1} className="text-ink text-lg font-bold mt-4">
          {displayName}
        </Text>
        <View className="flex-row items-center mt-1.5" style={{ gap: 6 }}>
          <View className="bg-ink rounded-full px-2.5 py-1">
            <Text className="text-lime text-[11px] font-semibold">{role}</Text>
          </View>
          {profile.company?.name ? (
            <Text numberOfLines={1} className="text-ink/50 text-xs">
              {profile.company.name}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={choosePhoto}
          className="flex-row items-center h-9 px-4 rounded-xl border border-ink/10 mt-4 active:bg-ivory"
        >
          <Ionicons name={showPhoto ? "swap-horizontal" : "image-outline"} size={14} color={brand.ink} />
          <Text className="text-ink text-xs font-semibold ml-1.5">
            {showPhoto ? "Change photo" : "Add a photo"}
          </Text>
        </Pressable>
      </View>

      <View className="px-6 pt-4 pb-5 mt-5 border-t border-ink/5">
        <PreviewLine icon="call-outline" value={phone.trim()} />
        <PreviewLine icon="mail-outline" value={profile.email} />
        <Text className="text-ink/40 text-[11px] leading-4 mt-2">
          This is how your manager and teammates see you.
        </Text>
      </View>
    </View>
  );

  const form = (
    <View style={{ gap: 16 }}>
      <Section icon="person-outline" title="Personal details" subtitle="Keep these up to date">
        <View style={{ gap: 18 }}>
          <View>
            <Label required>Full name</Label>
            <Input
              icon="person-outline"
              value={name}
              placeholder="John Doe"
              autoComplete="name"
              onChangeText={setName}
            />
          </View>
          <View>
            <Label required>Phone number</Label>
            <Input
              icon="call-outline"
              value={phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+250 788 000 000"
              onChangeText={setPhone}
            />
            <Text className="text-ink/40 text-[11px] mt-1.5">
              Your manager uses this to reach you about shifts.
            </Text>
          </View>
        </View>
      </Section>

      <Section icon="shield-checkmark-outline" title="Sign-in" subtitle="Managed by your company">
        <View style={{ gap: 14 }}>
          <View>
            <Label>Email</Label>
            <View className="flex-row items-center bg-ivory/60 border border-ink/5 rounded-xl px-3.5 min-h-[48px]">
              <Ionicons name="mail-outline" size={17} color={brand.inkDisabled} />
              <Text numberOfLines={1} className="flex-1 text-[15px] text-ink/50 ml-2.5">
                {profile.email}
              </Text>
              <View className="flex-row items-center bg-white rounded-full px-2 py-0.5 border border-ink/5">
                <Ionicons name="lock-closed" size={10} color={brand.inkMuted} />
                <Text className="text-ink/50 text-[10px] font-semibold ml-1">Locked</Text>
              </View>
            </View>
            <Text className="text-ink/40 text-[11px] mt-1.5">Ask your manager to change your email.</Text>
          </View>
          {/* Employees sign in with a PIN; everyone else with email + password. */}
          <Pressable
            onPress={() => router.push(isEmployee ? "/(tabs)/profile/pin" : "/(tabs)/profile/password")}
            className="flex-row items-center h-11 px-3.5 rounded-xl border border-ink/10 active:bg-ivory"
          >
            <Ionicons name={isEmployee ? "keypad-outline" : "lock-closed-outline"} size={15} color={brand.ink} />
            <Text className="flex-1 text-ink text-[13px] font-semibold ml-2">
              {isEmployee ? "Change PIN" : "Change password"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={brand.inkDisabled} />
          </Pressable>
        </View>
      </Section>

      <ErrorNote message={error} />

      {/* Footer */}
      <View className="bg-white rounded-2xl border border-ink/5 p-3 flex-row flex-wrap items-center" style={{ gap: 12 }}>
        <View className="flex-1 flex-row items-center pl-2" style={{ minWidth: 180 }}>
          <Ionicons
            name={dirty ? "ellipse" : "checkmark-circle"}
            size={dirty ? 8 : 15}
            color={dirty ? brand.limeDark : brand.success}
          />
          <Text className="text-ink/60 text-xs ml-2">
            {dirty ? "You have unsaved changes" : "Everything is saved"}
          </Text>
        </View>
        <SecondaryButton label="Discard" icon="arrow-undo-outline" onPress={discard} disabled={!dirty || saving} />
        <View style={{ minWidth: 170 }}>
          <PrimaryButton
            label="Save changes"
            busyLabel="Saving..."
            icon="checkmark-circle-outline"
            busy={saving}
            onPress={() => (dirty ? save() : router.back())}
          />
        </View>
      </View>
    </View>
  );

  return (
    <ProfilePage wide title="Edit profile" subtitle="Update your photo and contact details.">
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 20 }}>
        <View style={isWide ? { width: 340 } : undefined}>{preview}</View>
        <View className={isWide ? "flex-1" : ""}>{form}</View>
      </View>
    </ProfilePage>
  );
}
