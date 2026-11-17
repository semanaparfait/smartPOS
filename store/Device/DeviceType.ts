import type { DeviceKind } from "@/config/deviceTypes";

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceOs: string;
  companyCode: string;
}

export interface DeviceType {
  deviceInfo: DeviceInfo;
}

export interface CurrentUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface DeviceCompany {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  code: string;
  logo: string | null;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  type: string;
}

export interface DeviceListType {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;

  deviceId: string;
  deviceName: string;
  deviceOs: string;
  registrationStatus: string;
  // What the device is used for; missing on older backends (a till, see deviceKind()).
  type?: DeviceKind;
  // Customer displays only: the till whose cart and payment they show.
  displayFor?: { id: string; deviceName: string } | null;
  // MoMo Pay code customers pay to at this device (null = none).
  momoCode?: string | null;
  // A kitchen display's station; null shows every station.
  stationId?: string | null;
  // Sign-in lock after too many wrong PINs/passwords (missing on older servers).
  lockedUntil?: string | null;
  // Staff (user ids) who may sign in here, with the "Choose who uses each
  // device" extra on. Empty = anyone on the staff; owners always can.
  allowedUserIds?: string[];
  failedSignIns?: number;

  company: DeviceCompany;

  currentUser: CurrentUser | null;

  lastSeenAt: string | null;
  lastLoginAt: string | null;
  lastActivity: string | null;
  lastActivityAt: string | null;

  online: boolean;
}

export interface ActivityLogUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface ActivityLog {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  user: ActivityLogUser | null;
  action: string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  // What the server said, e.g. "Wrong PIN". Owners see this instead of the endpoint.
  message?: string | null;
}

export type ActivityLogResponse = ActivityLog[];
