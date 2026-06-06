export interface DeviceInfo {
  deviceId: string,
  deviceName: string,
  deviceOs: string,
  companyCode: string
}

export interface DeviceType {
  deviceInfo: DeviceInfo
}