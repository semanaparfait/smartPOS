export interface DeviceInfo {
  deviceId: string,
  deviceName: string,
  deviceOs: string,
  companyCode: string
}

export interface DeviceType {
  deviceInfo: DeviceInfo
}

export interface DeviceListType {
  id: string;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  deviceName: string;
  deviceOs: string;
  registrationStatus: string;
  company: {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    logo: null;
    name: string;
    email: string;
    phone_number: string;
    location: string;
    type: string;
  };
}
       