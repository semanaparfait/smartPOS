import type { RoleResponse } from "@/store/Employee/RoleTypes";
import type { ImageFile } from "@/utils/imageUrl";

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

// Body for PATCH /employees/:id (the photo isn't part of it).
export interface Employee {
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

  // Uploaded photo; pass through secureUrl() to get its link.
  profile: ImageFile | null;
  name: string;
  email: string;
  phone: string;
  salary: number;

  role: RoleResponse;
  shift: ShiftType;
  company: Company;
}
