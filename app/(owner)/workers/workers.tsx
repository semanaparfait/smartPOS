import AddWorker from "@/app/(owner)/workers/employees/addWorker";
import ViewUsers from "@/app/(owner)/workers/employees/ViewUsers";
import AddRole from "@/app/(owner)/workers/roles/AddRole";
import ViewRole from "@/app/(owner)/workers/roles/ViewRole";
import StatCard, { statCardWidth } from "@/app/components/ownerComponents/StatCard";
import { brand } from "@/config/theme";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

type Mode = "team" | "addEmployee" | "addRole";

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  team: { title: "Workers", subtitle: "Your team, their roles and what they earn." },
  addEmployee: { title: "Add an employee", subtitle: "They can sign in on the POS once added." },
  addRole: { title: "Add a role", subtitle: "Roles group employees by what they do." },
};

export default function Workers() {
  const { employeeResponses, getEmployees } = useEmployee();
  const { rolesResponse, getRoles } = useRole();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>("team");

  useEffect(() => {
    const fetchData = async () => {
      await getEmployees();
      await getRoles();
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const payroll = employeeResponses.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const usedRoles = new Set(employeeResponses.map((e) => e.role?.id).filter(Boolean));
    return {
      employees: employeeResponses.length,
      roles: rolesResponse.length,
      emptyRoles: rolesResponse.filter((r) => !usedRoles.has(r.id)).length,
      payroll,
      avgSalary: employeeResponses.length ? Math.round(payroll / employeeResponses.length) : 0,
    };
  }, [employeeResponses, rolesResponse]);

  const cardWidth = statCardWidth(width);
  const isWide = width >= 1250;
  const backToTeam = () => setMode("team");

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      <View className="p-6" style={{ gap: 20 }}>
        {/* Header */}
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <View className="flex-row items-center">
            {mode !== "team" && (
              <Pressable
                onPress={backToTeam}
                accessibilityLabel="Back to team"
                className="w-10 h-10 rounded-xl bg-white border border-ink/10 items-center justify-center mr-3 active:bg-ivory"
              >
                <Ionicons name="arrow-back" size={18} color={brand.ink} />
              </Pressable>
            )}
            <View>
              <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">
                Team
              </Text>
              <Text className="text-ink text-2xl font-extrabold tracking-tight">
                {TITLES[mode].title}
              </Text>
              <Text className="text-ink/50 text-[13px] mt-0.5">{TITLES[mode].subtitle}</Text>
            </View>
          </View>

          {mode === "team" && (
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable
                onPress={() => setMode("addRole")}
                className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
              >
                <Ionicons name="briefcase-outline" size={15} color={brand.ink} />
                <Text className="text-ink text-[13px] font-bold ml-2">New role</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("addEmployee")}
                className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink-soft"
              >
                <Ionicons name="person-add-outline" size={15} color={brand.lime} />
                <Text className="text-white text-[13px] font-bold ml-2">New employee</Text>
              </Pressable>
            </View>
          )}
        </View>

        {mode === "team" ? (
          <>
            {/* Stats */}
            <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
              <StatCard
                dark
                icon="people"
                label="Employees"
                value={stats.employees.toLocaleString()}
                hint="On your team"
                width={cardWidth}
              />
              <StatCard
                icon="briefcase-outline"
                label="Roles"
                value={stats.roles.toLocaleString()}
                hint={stats.emptyRoles ? `${stats.emptyRoles} with nobody assigned` : "All roles filled"}
                width={cardWidth}
              />
              <StatCard
                icon="cash-outline"
                label="Monthly payroll"
                value={`${stats.payroll.toLocaleString()} RWF`}
                hint="Sum of all salaries"
                width={cardWidth}
              />
              <StatCard
                icon="stats-chart-outline"
                label="Average salary"
                value={`${stats.avgSalary.toLocaleString()} RWF`}
                hint="Per employee"
                width={cardWidth}
              />
            </View>

            {/* Employees + roles */}
            <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
              <View className="flex-1 min-w-0">
                <ViewUsers />
              </View>
              <View style={isWide ? { width: 340 } : undefined}>
                <ViewRole onAdd={() => setMode("addRole")} />
              </View>
            </View>
          </>
        ) : mode === "addEmployee" ? (
          <AddWorker onBack={backToTeam} />
        ) : (
          <AddRole onBack={backToTeam} />
        )}
      </View>
    </ScrollView>
  );
}
