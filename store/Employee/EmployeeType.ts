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
  // Most they may give on credit in one sale; null = no credit sales.
  creditLimit?: number | string | null;

  role: RoleResponse;
  shift: ShiftType;
  company: Company;
  // Access on top of the role, for this employee only (permission keys).
  extraPermissions: string[]; // given by the owner
  removedPermissions: string[]; // taken away by the owner
  // Final access after both; null = everything allowed.
  permissions?: string[] | null;

  // The employee's login. Missing when they have none (they can't be deactivated).
  // allowMultipleDevices: when false, signing in on a new till signs them out of the old one.
  user?: { id: string; active: boolean; lastLoginAt?: string | null; allowMultipleDevices?: boolean } | null;
}

// Body for PATCH /employees/:id/permissions. Omit a list to keep it, [] clears it.
export interface EmployeePermissionsUpdate {
  extraPermissions?: string[];
  removedPermissions?: string[];
  // Most they may give on credit in one sale; required with "Sell on credit".
  creditLimit?: number | null;
}

// Employees without a login count as active: there's nothing to switch off.
export const isEmployeeActive = (employee: EmployeeResponse) => employee.user?.active !== false;
