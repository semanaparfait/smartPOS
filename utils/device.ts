import { Platform } from 'react-native';

declare global {
  interface Window {
    electronAPI?: {
      getDeviceId: () => Promise<string>;
      getDeviceName: () => Promise<string>;
    };
  }
}

export async function fetchUniversalDeviceInfo() {
  // 1. Windows Desktop (Electron) & Web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.electronAPI?.getDeviceId) {
      try {
        const rawId = await window.electronAPI.getDeviceId();
        const deviceName = await window.electronAPI.getDeviceName();
        return {
          deviceId: rawId ? rawId.substring(0, 16).toUpperCase() : 'WIN-DEVICE',
          deviceName: deviceName || 'Windows PC',
          deviceOs: 'Windows Desktop',
        };
      } catch (err) {
        console.warn('Failed to retrieve Electron device ID:', err);
      }
    }

    // Web browser fallback
    let browserId = typeof window !== 'undefined' ? localStorage.getItem('smartpos_device_id') : null;
    if (!browserId) {
      browserId = 'WEB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      if (typeof window !== 'undefined') localStorage.setItem('smartpos_device_id', browserId);
    }
    return {
      deviceId: browserId,
      deviceName: 'Web Browser',
      deviceOs: 'Web Application',
    };
  }

  // 2. Android & iOS (Loaded only on native runtimes)
  const DeviceInfo = require('react-native-device-info').default || require('react-native-device-info');
  return {
    deviceId: await DeviceInfo.getUniqueId(),
    deviceName: await DeviceInfo.getDeviceName(),
    deviceOs: `${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`,
  };
}