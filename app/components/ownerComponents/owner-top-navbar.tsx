import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import { ownerPageAccess } from "@/config/ownerAccess";
import { useClock } from "@/components/brand";
import { brand } from "@/config/theme";

import { secureUrl } from "@/utils/imageUrl";
type OwnerTopNavbarProps = {
  title?: string;
  // Parent section shown as a breadcrumb, e.g. "Inventory".
  section?: string;
  email: string;
  avatarInitial: string;
};

const NAVBAR_HEIGHT = 76;

const MENU_LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { icon: "business-outline", label: "Company Profile", route: "/(owner)/Settings/CompanyProfile" },
  { icon: "create-outline", label: "Edit Profile", route: "/(owner)/Settings/EditProfile" },
  { icon: "lock-closed-outline", label: "Change Password", route: "/(owner)/Settings/password" },
  { icon: "hardware-chip-outline", label: "Devices", route: "/(owner)/Settings/Devices/DeviceInformation" },
];

function IconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  badge?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-11 h-11 rounded-xl bg-ivory border border-ink/5 items-center justify-center active:bg-ink/5"
    >
      <Ionicons name={icon} size={20} color={brand.ink} />
      {badge && (
        <View className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-ivory" />
      )}
    </Pressable>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      className="flex-row items-center rounded-xl px-3 py-2.5 active:bg-ivory"
    >
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center ${danger ? "bg-red-50" : "bg-ivory"}`}
      >
        <Ionicons name={icon} size={16} color={danger ? brand.danger : brand.ink} />
      </View>
      <Text
        className="flex-1 ml-3 text-[13px] font-semibold"
        style={{ color: danger ? brand.danger : brand.ink }}
      >
        {label}
      </Text>
      {!danger && (
        <Ionicons name="chevron-forward" size={14} color={brand.inkDisabled} />
      )}
    </Pressable>
  );
}

export default function OwnerTopNavbar({
  title = "Dashboard",
  section,
  email,
  avatarInitial,
}: OwnerTopNavbarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fetchProfile, logout } = useAuth();
  const profile = useAuth((state) => state.profile);
  const { time, date } = useClock();
  const { isOwner, canAny } = usePermissions();
  // Workers in the owner area only get the menu links their switches open.
  const canOpen = (route: string) => {
    if (isOwner) return true;
    const needs = ownerPageAccess(route);
    return !!needs && canAny(...needs);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const company = profile?.company;
  const name = profile?.name ?? "Owner";
  const role = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()
    : "Owner";
  const initial = profile?.name?.trim().charAt(0).toUpperCase() || avatarInitial;
  const companyInitial = company?.name?.trim().charAt(0).toUpperCase() ?? "S";
  const showLogo = !!company?.logo && !logoFailed;
  const photo = secureUrl(profile?.picture?.thumbnailUrl ?? profile?.picture?.url);
  const showPhoto = !!photo && !photoFailed;

  // Try again when a new photo is uploaded.
  useEffect(() => setPhotoFailed(false), [photo]);

  const avatar = (size: number) =>
    showPhoto ? (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size }}
        resizeMode="cover"
        onError={() => setPhotoFailed(true)}
      />
    ) : (
      <Text className="text-lime font-extrabold text-base">{initial}</Text>
    );

  const go = (route: string) => {
    setMenuOpen(false);
    router.push(route as Href);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/");
  };

  return (
    <View
      className="px-6 bg-white border-b border-ink/5 flex-row items-center"
      style={{ height: NAVBAR_HEIGHT }}
    >
      {/* Title + breadcrumb */}
      <View className="flex-1 pr-4 flex-row items-center">
        <View className="w-1 h-10 rounded-full bg-lime mr-3.5" />
        <View className="flex-1">
          <View className="flex-row items-center">
            <Ionicons name="home-outline" size={11} color={brand.inkDisabled} />
            <Text className="text-ink/40 text-[11px] font-semibold ml-1">Owner</Text>
            {section && (
              <>
                <Ionicons
                  name="chevron-forward"
                  size={10}
                  color={brand.inkDisabled}
                  style={{ marginHorizontal: 4 }}
                />
                <Text className="text-ink/40 text-[11px] font-semibold">{section}</Text>
              </>
            )}
          </View>
          <Text
            numberOfLines={1}
            className="text-ink text-[22px] font-extrabold tracking-tight"
          >
            {title}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center" style={{ gap: 10 }}>
        {/* Company */}
        {company && (
          <View className="flex-row items-center rounded-xl border border-ink/5 bg-ivory pl-1.5 pr-3.5 h-11">
            <View className="w-8 h-8 rounded-lg bg-white border border-ink/5 items-center justify-center overflow-hidden">
              {showLogo ? (
                <Image
                  source={{ uri: secureUrl(company.logo) }}
                  style={{ width: 32, height: 32 }}
                  resizeMode="cover"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Text className="text-ink font-extrabold text-sm">{companyInitial}</Text>
              )}
            </View>
            <View className="ml-2.5 max-w-[160px]">
              <Text numberOfLines={1} className="text-ink text-[12px] font-bold">
                {company.name}
              </Text>
              {!!company.location && (
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={10} color={brand.inkMuted} />
                  <Text numberOfLines={1} className="text-ink/50 text-[10px] ml-0.5">
                    {company.location}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Clock */}
        <View className="flex-row items-center rounded-xl bg-ink px-3.5 h-11">
          <Ionicons name="time-outline" size={16} color={brand.lime} />
          <View className="ml-2">
            <Text className="text-white text-[13px] font-extrabold leading-4">{time}</Text>
            <Text className="text-white/50 text-[10px] font-semibold leading-3">{date}</Text>
          </View>
        </View>

        <IconButton icon="notifications-outline" label="Notifications" badge />

        <View className="w-px h-8 bg-ink/10 mx-1" />

        {/* Profile */}
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          accessibilityState={{ expanded: menuOpen }}
          className={`flex-row items-center rounded-xl pl-1.5 pr-2.5 h-12 ${menuOpen ? "bg-ivory" : "active:bg-ivory"}`}
        >
          <View>
            <View className="h-9 w-9 rounded-xl bg-ink items-center justify-center overflow-hidden">
              {avatar(36)}
            </View>
            <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime border-2 border-white" />
          </View>
          <View className="ml-2.5 mr-2 max-w-[150px]">
            <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
              {name}
            </Text>
            <Text numberOfLines={1} className="text-ink/40 text-[11px] font-medium">
              {role}
            </Text>
          </View>
          <Ionicons
            name={menuOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={brand.inkMuted}
          />
        </Pressable>
      </View>

      {/* Account menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          className="flex-1"
          onPress={() => setMenuOpen(false)}
          accessibilityLabel="Close account menu"
        >
          <Pressable
            onPress={() => {}}
            className="absolute right-6 w-[260px] bg-white rounded-2xl border border-ink/5 p-2"
            style={{
              top: insets.top + NAVBAR_HEIGHT - 6,
              shadowColor: brand.ink,
              shadowOpacity: 0.15,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}
          >
            <View className="flex-row items-center px-3 pt-2 pb-3 mb-1 border-b border-ink/5">
              <View className="h-10 w-10 rounded-xl bg-ink items-center justify-center overflow-hidden">
                {avatar(40)}
              </View>
              <View className="flex-1 ml-3">
                <Text numberOfLines={1} className="text-ink text-sm font-bold">
                  {name}
                </Text>
                <Text numberOfLines={1} className="text-ink/40 text-[11px]">
                  {profile?.email ?? email}
                </Text>
              </View>
            </View>

            {MENU_LINKS.filter((link) => canOpen(link.route)).map((link) => (
              <MenuItem key={link.route} icon={link.icon} label={link.label} onPress={() => go(link.route)} />
            ))}
            {!isOwner && (
              <MenuItem icon="person-circle-outline" label="My profile" onPress={() => go("/(tabs)/profile/profile")} />
            )}
            <MenuItem
              icon="storefront-outline"
              label="Open Point of Sale"
              onPress={() => go("/(tabs)/products/products")}
            />

            <View className="h-px bg-ink/5 my-1" />

            <MenuItem
              icon="log-out-outline"
              label="Log out"
              danger
              onPress={handleLogout}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
