import { API_URL } from "@/config/api";
import type { RoleType, RoleResponse } from "@/store/Employee/RoleTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface RoleStore {
  roles: RoleType[];
  rolesResponse: RoleResponse[];
  addRole: (role: RoleType) => Promise<void>;
  getRoles: () => Promise<RoleResponse[]>;
  updateRole: (id: string, updatedRole: RoleType) => Promise<void>;
  //   deleteRole: (roleId: number) => void;
}

const useRole = create<RoleStore>((set, get) => ({
  roles: [],
  rolesResponse: [],
  addRole: async (role: RoleType) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },

        body: JSON.stringify(role),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add role");
      }
      const newRole = await response.json();
      // add returned role to local state
      set((state) => ({ roles: [...state.roles, newRole] }));
    } catch (error) {
      console.error("Error adding role:", error);
    }
  },
  getRoles: async () => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return [];
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/roles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      const rolesResponse = await response.json();
      set((state) => ({ rolesResponse }));
      return rolesResponse;
    } catch (error) {
      console.error("Error fetching roles:", error);
      return [];
    }
  },
  updateRole: async (id: string, updatedRole: RoleType) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try { 
         const token = await AsyncStorage.getItem("token");

      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(updatedRole),
      })
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update role");
        }
      return response.json();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  }
}));
export default useRole;
