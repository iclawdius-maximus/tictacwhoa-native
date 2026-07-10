import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const DEVICE_ID_KEY = 'tictacwhoa_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.warn('SecureStore unavailable, using fallback device id:', error);
    const fallbackId = Constants.sessionId ?? generateDeviceId();
    return fallbackId;
  }
}

export async function getDeviceId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

export async function setDeviceId(deviceId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    console.error('Error setting device ID:', error);
  }
}

function generateDeviceId(): string {
  return 'ttw_' + Math.random().toString(36).substring(2, 10);
}
