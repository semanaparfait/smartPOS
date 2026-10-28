// Sent when creating or updating a role.
export interface RoleType {
  name: string;
  description: string;
  // Keys from config/permissions.ts.
  permissions: string[];
}

export interface RoleResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  // Missing on older backends that don't store permissions yet.
  permissions?: string[] | null;
}
