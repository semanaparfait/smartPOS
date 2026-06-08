export interface  Employee {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
}

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

export interface EmployeeResponse {
  id: string;
  createdAt: string;
  updatedAt: string;

  profile: string | null;
  name: string;
  email: string;
  phone: string;
  salary: number;

  role:  Employee;          // ✅ OBJECT (not string)
  shift: ShiftType;    // ✅ correct
  company: Company;
}