import type { Employee, EmployeeResponse } from "@/store/Employee/EmployeeType";
import { API_URL } from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface EmployeeStore {
  employees: Employee[];
  employeeResponses: EmployeeResponse[];
  addEmployee: (employee: Employee) => Promise<void>;
  getEmployees: () => Promise<Employee[]>;
}

const useEmployee = create<EmployeeStore>((set, get) => ({
  employees: [],
  employeeResponses: [],
  addEmployee: async (employee: Employee) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {    
          const token = await AsyncStorage.getItem("token");

      if (!token) return;
        const response = await fetch(`${API_URL}/api/v1/employee/employees`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(employee),
        });
        if (!response.ok) {
            throw new Error(`Error adding employee: ${response.status}`);
        }
    } catch (error) {
        console.error("Error adding employee:", error);
    }
  },
  getEmployees: async () => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return [];
    }
    try {      const token = await AsyncStorage.getItem("token");

      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/employee/employees`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) {
        throw new Error(`Error fetching employees: ${response.status}`);
      }
      const data = await response.json();
      set({ employeeResponses: data });
      return data;
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [];
    }
  },
  }));

  export default useEmployee;

