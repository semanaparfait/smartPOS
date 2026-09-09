const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getDeviceName: () => ipcRenderer.invoke('get-device-name'),
});