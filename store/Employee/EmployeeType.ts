import type { RoleResponse } from "@/store/Employee/RoleTypes";

export interface Company {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  logo: string | null;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  type: string;
}

export type ShiftType = "DAY" | "EVENING" | "NIGHT" | "HYBRID";

export interface Employee {
  profile: string;
  name: string;
  email: string;
  phone: string;
  salary: number;
  shift: ShiftType | "";
  roleId: string;
}

export interface EmployeeResponse {
  id: string;
  createdAt: string;
  updatedAt: string;

  profile: string | null;
  name: string;
  email: string;
  phone: string;
  salary: number;

  role: RoleResponse;
  shift: ShiftType;
  company: Company;
}
