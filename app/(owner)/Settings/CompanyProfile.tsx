import { PageHeader, initials } from "@/app/components/ownerComponents/FormKit";
import StatCard, { statCardWidth } from "@/app/components/ownerComponents/StatCard";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import useCategory from "@/store/category/useCategory";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : undefined;

const capitalize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : undefined;

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  mono?: boolean;
  // Opens the phone dialer / mail app when tapped.
  href?: string;
};

function DetailCard({
  icon,
  title,
  rows,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  rows: Row[];
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center mb-2">
        <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
        <Text className="text-ink text-[15px] font-extrabold tracking-tight ml-3">{title}</Text>
      </View>
      {rows.map((row, i) => {
        const content = (
          <View
            className={`flex-row items-center py-3 ${i === 0 ? "" : "border-t border-ink/5"}`}
          >
            <Ionicons name={row.icon} size={16} color={brand.inkMuted} />
            <Text className="text-ink/50 text-[13px] ml-3 w-[120px]">{row.label}</Text>
            <Text
              selectable
              numberOfLines={2}
              className="flex-1 text-ink text-[13px] font-semibold text-right"
              style={row.mono ? { fontFamily: MONO, letterSpacing: 1 } : undefined}
            >
              {row.value || "—"}
            </Text>
            {row.href && row.value ? (
              <Ionicons name="open-outline" size={13} color={brand.inkDisabled} style={{ marginLeft: 8 }} />
            ) : null}
          </View>
        );
        return row.href && row.value ? (
          <Pressable
            key={row.label}
            onPress={() => Linking.openURL(row.href!)}
            accessibilityRole="link"
            className="active:bg-ivory rounded-lg -mx-2 px-2"
          >
            {content}
          </Pressable>
        ) : (
          <View key={row.label}>{content}</View>
        );
      })}
    </View>
  );
}

export default function CompanyProfile() {
  const { fetchProfile } = useAuth();
  const profile = useAuth((state) => state.profile);
  const { employeeResponses, getEmployees } = useEmployee();
  const { rolesResponse, getRoles } = useRole();
  const { products, getProducts } = useProduct();
  const { categoriesResponse, getCategories } = useCategory();
  const { width } = useWindowDimensions();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Only load what isn't already in memory from other screens.
    if (employeeResponses.length === 0) getEmployees();
    if (rolesResponse.length === 0) getRoles();
    if (products.length === 0) getProducts();
    if (categoriesResponse.length === 0) getCategories();
  }, []);

  const company = profile?.company;

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
        <Text className="text-ink/40 text-xs mt-3">Loading company profile...</Text>
      </View>
    );
  }

  const cardWidth = statCardWidth(width);
  const isWide = width >= 1100;

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Settings"
        title="Company profile"
        subtitle="Your business details as customers and staff see them."
      />

      {/* Hero */}
      <View className="bg-ink rounded-3xl p-6 overflow-hidden">
        <View
          className="absolute rounded-full bg-lime/10"
          style={{ width: 300, height: 300, right: -90, top: -150 }}
        />
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 20 }}>
          <View className="flex-row items-center flex-1 min-w-[280px]">
            <View className="w-20 h-20 rounded-2xl bg-white items-center justify-center overflow-hidden">
              {company?.logo && !logoFailed ? (
                <Image
                  source={{ uri: company.logo }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Text className="text-ink text-2xl font-extrabold">{initials(company?.name)}</Text>
              )}
            </View>
            <View className="flex-1 ml-4">
              <Text numberOfLines={1} className="text-white text-2xl font-extrabold tracking-tight">
                {company?.name ?? "Your company"}
              </Text>
              <View className="flex-row flex-wrap items-center mt-2" style={{ gap: 6 }}>
                {company?.type ? (
                  <View className="flex-row items-center bg-lime rounded-full px-2.5 py-1">
                    <Ionicons name="storefront" size={11} color={brand.ink} />
                    <Text className="text-ink text-[11px] font-extrabold ml-1">
                      {capitalize(company.type)}
                    </Text>
                  </View>
                ) : null}
                {company?.location ? (
                  <View className="flex-row items-center bg-white/10 rounded-full px-2.5 py-1">
                    <Ionicons name="location" size={11} color={brand.white} />
                    <Text numberOfLines={1} className="text-white text-[11px] font-bold ml-1">
                      {company.location}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View className="flex-row" style={{ gap: 28 }}>
            <View>
              <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px]">
                Company code
              </Text>
              <Text
                selectable
                className="text-lime text-xl font-bold mt-1"
                style={{ fontFamily: MONO, letterSpacing: 2 }}
              >
                {company?.code ?? "—"}
              </Text>
            </View>
            <View>
              <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px]">
                Registered
              </Text>
              <Text className="text-white text-xl font-extrabold tracking-tight mt-1">
                {formatDate(company?.createdAt) ?? "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* At a glance */}
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
        <StatCard
          icon="people-outline"
          label="Employees"
          value={employeeResponses.length.toLocaleString()}
          hint={`${rolesResponse.length} roles`}
          width={cardWidth}
        />
        <StatCard
          icon="cube-outline"
          label="Products"
          value={products.length.toLocaleString()}
          hint={`${products.filter((p) => p.active).length} active`}
          width={cardWidth}
        />
        <StatCard
          icon="folder-open-outline"
          label="Categories"
          value={categoriesResponse.length.toLocaleString()}
          hint="Product groups"
          width={cardWidth}
        />
        <StatCard
          icon="cash-outline"
          label="Monthly payroll"
          value={`${employeeResponses
            .reduce((sum, e) => sum + (Number(e.salary) || 0), 0)
            .toLocaleString()} RWF`}
          hint="Sum of all salaries"
          width={cardWidth}
        />
      </View>

      {/* Details */}
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        <View className="flex-1" style={{ gap: 16 }}>
          <DetailCard
            icon="business-outline"
            title="Business details"
            rows={[
              { icon: "storefront-outline", label: "Name", value: company?.name },
              { icon: "apps-outline", label: "Industry", value: capitalize(company?.type) },
              { icon: "key-outline", label: "Company code", value: company?.code, mono: true },
              { icon: "calendar-outline", label: "Registered on", value: formatDate(company?.createdAt) },
              { icon: "refresh-outline", label: "Last updated", value: formatDate(company?.updatedAt) },
            ]}
          />
        </View>
        <View className="flex-1" style={{ gap: 16 }}>
          <DetailCard
            icon="call-outline"
            title="Contact"
            rows={[
              {
                icon: "call-outline",
                label: "Phone",
                value: company?.phone_number,
                href: company?.phone_number ? `tel:${company.phone_number}` : undefined,
              },
              {
                icon: "mail-outline",
                label: "Email",
                value: company?.email,
                href: company?.email ? `mailto:${company.email}` : undefined,
              },
              { icon: "location-outline", label: "Address", value: company?.location },
            ]}
          />

          {/* Account owner */}
          <View className="bg-white rounded-2xl border border-ink/5 p-5">
            <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px] mb-3">
              Account owner
            </Text>
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-ink items-center justify-center">
                <Text className="text-lime text-base font-extrabold">{initials(profile.name)}</Text>
              </View>
              <View className="flex-1 ml-3">
                <Text numberOfLines={1} className="text-ink text-[15px] font-extrabold">
                  {profile.name}
                </Text>
                <Text numberOfLines={1} className="text-ink/50 text-xs mt-0.5">
                  {profile.email}
                  {profile.phone ? ` · ${profile.phone}` : ""}
                </Text>
              </View>
              <View className="bg-lime rounded-full px-2.5 py-1">
                <Text className="text-ink text-[11px] font-extrabold">
                  {capitalize(profile.role) ?? "Owner"}
                </Text>
              </View>
            </View>
            {profile.lastLoginAt ? (
              <View className="flex-row items-center mt-4 pt-3 border-t border-ink/5">
                <Ionicons name="time-outline" size={14} color={brand.inkMuted} />
                <Text className="text-ink/50 text-xs ml-2">
                  Last sign-in{" "}
                  {new Date(profile.lastLoginAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
