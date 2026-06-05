export interface Login {
  deviceId: string;
    email: string;
    password: string;
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
}