export interface users {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "worker" | "manager" | "kitchen" | "hr" | "accountant";
  status: "active" | "inactive";
  salary: number;
  permissions: number;
  color: string;
  profilePicture: string;

  joiningDate: string;
  paymentDate: string;
  paymentStatus: "paid" | "pending" | "overdue";
}

export const users: users[] = [
  {
    id: 1,
    name: "Semana Shema Parfait",
    email: "shema@pos.com",
    phone: "0788000001",
    role: "worker",
    status: "active",
    salary: 50000,
    permissions: 8,
    color: "#64748B",
    profilePicture: "https://randomuser.me/api/portraits/men/1.jpg",
    joiningDate: "2025-01-10",
    paymentDate: "2026-06-30",
    paymentStatus: "paid",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "0788000002",
    role: "owner",
    status: "active",
    salary: 120000,
    permissions: 25,
    color: "#DC2626",
    profilePicture: "https://randomuser.me/api/portraits/women/2.jpg",
    joiningDate: "2024-03-01",
    paymentDate: "2026-06-30",
    paymentStatus: "paid",
  },
  {
    id: 3,
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    phone: "0788000003",
    role: "kitchen",
    status: "active",
    salary: 45000,
    permissions: 10,
    color: "#16A34A",
    profilePicture: "https://randomuser.me/api/portraits/women/3.jpg",
    joiningDate: "2025-08-15",
    paymentDate: "2026-06-30",
    paymentStatus: "pending",
  },
  {
    id: 4,
    name: "Bob Brown",
    email: "bob.brown@example.com",
    phone: "0788000004",
    role: "manager",
    status: "active",
    salary: 70000,
    permissions: 15,
    color: "#2563EB",
    profilePicture: "https://randomuser.me/api/portraits/men/4.jpg",
    joiningDate: "2023-11-20",
    paymentDate: "2026-06-30",
    paymentStatus: "paid",
  },
  {
    id: 5,
    name: "Sarah Uwase",
    email: "sarah.uwase@example.com",
    phone: "0788000005",
    role: "hr",
    status: "active",
    salary: 60000,
    permissions: 18,
    color: "#059669",
    profilePicture: "https://randomuser.me/api/portraits/women/5.jpg",
    joiningDate: "2024-06-05",
    paymentDate: "2026-06-30",
    paymentStatus: "overdue",
  },
  {
    id: 6,
    name: "David Kim",
    email: "david.kim@example.com",
    phone: "0788000006",
    role: "accountant",
    status: "inactive",
    salary: 65000,
    permissions: 12,
    color: "#7C3AED",
    profilePicture: "https://randomuser.me/api/portraits/men/6.jpg",
    joiningDate: "2022-09-12",
    paymentDate: "2026-06-30",
    paymentStatus: "paid",
  },
];