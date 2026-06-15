import ViewRole from "@/app/(owner)/workers/roles/ViewRole";
import ViewUsers from "@/app/(owner)/workers/employees/ViewUsers";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CreditCard,
  Users,
  Vault,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";

export default function Workers() {
  const { employeeResponses, getEmployees } = useEmployee();
  const { rolesResponse, getRoles } = useRole();

  useEffect(() => {
    const fetchData = async () => {
      await getEmployees();
      await getRoles();
    };
    fetchData();
  }, []);

  // let amount = employeeResponses.reduce((total, employee) => total + employee.salary, 0),
  const workersData = [
    {
      icon: Users,
      title: "Total Employees",
      value: employeeResponses.length,
    },
    {
      icon: BriefcaseBusiness,
      title: "Total Role",
      value: rolesResponse.length,
    },
    {
      icon: BadgeDollarSign,
      title: "Total Payroll",
      value: `${employeeResponses
        .reduce((total, employee) => total + employee.salary, 0)
        .toLocaleString()} RWF`,
    },
    {
      icon: CreditCard,
      title: "Upcoming Payments",
      value: employeeResponses.filter((employee) => {
        const nextPaymentDate = new Date(employee.createdAt);
        const today = new Date();
        return nextPaymentDate > today;
      }).length,
    },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-2 gap-4">
        {workersData.map((item, index) => (
          <View
            key={index}
            className="bg-white gap-2 p-4 rounded-2xl mb-4 flex-row items-center shadow-sm border border-slate-100"
          >
            <View className="p-3 rounded-full bg-green-300">
              <item.icon size={20} color="green" />
            </View>
            <View className="ml-4">
              <Text className="text-sm text-slate-500 font-medium">
                {item.title}
              </Text>
              <Text className="text-lg font-bold text-slate-800">
                {item.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <ViewRole />

      {/* Search Bar */}

      {/* User List */}
      <ViewUsers />
    </ScrollView>
  );
}
