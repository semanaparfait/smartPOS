import { API_URL } from "@/config/api";
import type { Employee, EmployeeResponse } from "@/store/Employee/EmployeeType";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface EmployeeStore {
  employees: Employee[];
  employeeResponses: EmployeeResponse[];
  addEmployee: (employee: FormData) => Promise<Record<string, unknown>>;
  getEmployees: () => Promise<Employee[]>;
  getEmployeeById: (id: string) => Promise<EmployeeResponse | null>;
  DeleteEmployee: (id: string) => Promise<void>;
  updateEmployee: (id: string, employee: Employee) => Promise<void>;
}

const useEmployee = create<EmployeeStore>((set, get) => ({
  employees: [],
  employeeResponses: [],
  addEmployee: async (employee: FormData) => {
    if (!API_URL) {
      throw new Error("API_URL is not configured");
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) throw new Error("Authentication token is missing");
      const response = await fetch(`${API_URL}/api/v1/employees`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: employee,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Error adding employee: ${response.status}`);
      }
      const body = await response.text();
      return body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch (error) {
      console.error("Error adding employee:", error);
      throw error;
    }
  },
  getEmployees: async () => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return [];
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/employees`, {
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
  getEmployeeById: async (id: string) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return null;
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return null;
      const response = await fetch(`${API_URL}/api/v1/employees/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) {
        throw new Error(`Error fetching employee: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching employee:", error);
      return null;
    }
  },
  DeleteEmployee: async (id: string) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/employees/${id}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) {
        throw new Error(`Error deleting employee: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  },
  updateEmployee: async (id: string, employee: Employee) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/employees/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(employee),
      });
      if (!response.ok) {
        throw new Error(`Error updating employee: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  },
}));

export default useEmployee;
