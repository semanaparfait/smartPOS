import { API_URL } from "@/config/api";
import type {
  Employee,
  EmployeePermissionsUpdate,
  EmployeeResponse,
} from "@/store/Employee/EmployeeType";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// The API's own message (e.g. "You cannot change your own role"), written to be shown as is.
const apiMessage = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
  return message || fallback;
};

interface EmployeeStore {
  employees: Employee[];
  employeeResponses: EmployeeResponse[];
  addEmployee: (employee: FormData) => Promise<Record<string, unknown>>;
  getEmployees: () => Promise<Employee[]>;
  getEmployeeById: (id: string) => Promise<EmployeeResponse | null>;
  DeleteEmployee: (id: string) => Promise<void>;
  updateEmployee: (id: string, employee: Employee) => Promise<void>;
  // Deactivated employees can't sign in until activated again.
  setEmployeeActive: (id: string, active: boolean) => Promise<EmployeeResponse>;
  // Throws with the API's message (e.g. a 400 about conflicting permissions).
  setEmployeePermissions: (id: string, changes: EmployeePermissionsUpdate) => Promise<EmployeeResponse>;
  // Turning it off keeps only their most recent sign-in.
  setEmployeeMultipleDevices: (id: string, allow: boolean) => Promise<EmployeeResponse>;
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
        throw new Error(await apiMessage(response, "Could not delete this employee"));
      }
      set((state) => ({
        employeeResponses: state.employeeResponses.filter((e) => e.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw error;
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
        throw new Error(await apiMessage(response, "Could not save this employee"));
      }
      // Refresh so lists show the saved values (role names, etc.).
      await get().getEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  },
  setEmployeeActive: async (id: string, active: boolean) => {
    if (!API_URL) throw new Error("API_URL is not configured");
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Authentication token is missing");
    const response = await fetch(`${API_URL}/api/v1/employees/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ active }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
      throw new Error(message || `Could not ${active ? "activate" : "deactivate"} employee`);
    }
    const updated: EmployeeResponse = data;
    set((state) => ({
      employeeResponses: state.employeeResponses.map((e) => (e.id === id ? updated : e)),
    }));
    return updated;
  },
  setEmployeePermissions: async (id, changes) => {
    if (!API_URL) throw new Error("API_URL is not configured");
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Authentication token is missing");
    const response = await fetch(`${API_URL}/api/v1/employees/${id}/permissions`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
      throw new Error(message || "Could not save this worker's access");
    }
    const updated: EmployeeResponse = data;
    set((state) => ({
      employeeResponses: state.employeeResponses.map((e) => (e.id === id ? updated : e)),
    }));
    return updated;
  },
  setEmployeeMultipleDevices: async (id, allow) => {
    if (!API_URL) throw new Error("API_URL is not configured");
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Authentication token is missing");
    const response = await fetch(`${API_URL}/api/v1/employees/${id}/multiple-devices`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ allow }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
      throw new Error(message || "Could not change this setting");
    }
    const updated: EmployeeResponse = data;
    set((state) => ({
      employeeResponses: state.employeeResponses.map((e) => (e.id === id ? updated : e)),
    }));
    return updated;
  },
}));

export default useEmployee;
