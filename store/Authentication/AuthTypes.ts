export interface Login {
  deviceId: string;
    email: string;
    password: string;
}

export const COMPANY_TYPES = [
  "RESTAURANT",
  "BAR",
  "HOTEL",
  "SUPERMARKET",
  "PHARMACY",
  "SHOP",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

// Fields PATCH /auth/me accepts. currentPassword is required when email changes.
export interface ProfileUpdate {
  name?: string;
  phone?: string;
  email?: string;
  currentPassword?: string;
}

export interface CompanyUpdate {
  name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  type?: CompanyType;
}

// A newly picked image: the File blob on web, the local uri on native.
export interface PickedImage {
  uri: string;
  file: Blob | null;
}

export interface PinLogin {
    deviceId: string;
    pin: string;
}

// export interface profile{
    
//   id: string;
//   createdAt: string;
//   updatedAt: string;
//   employee: string;
//   company: {
//     id: string;
//     createdAt: string;
//     updatedAt: string;
//     code: string;
//     logo: string;
//     name: string;
//     email: string;
//     phone_number: string;
//     location: string;
//     type: string;
//   },
//   name: string;
//   email: string;
//   phone: string;
//   pin: string;
//   password: string;
//   role: string;
//   active: boolean;
//   mustChangePassword: boolean;
//   lastLoginAt: string;

// }

export interface profile {
  id: string;
  createdAt: string;
  updatedAt: string;

  employee: string | null;

  company: {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    logo: string;
    name: string;
    email: string;
    phone_number: string;
    location: string;
    type: string;
  } | null;

  name: string;
  email: string;
  phone: string;
  pin: string | null;
  password: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;

  // Employee photo for staff, own avatar for owners.
  picture?: { url: string; thumbnailUrl: string } | null;

  // Keys from config/permissions.ts granted by the employee's role.
  // Not sent by older backends; see usePermissions for the fallback.
  permissions?: string[] | null;
}