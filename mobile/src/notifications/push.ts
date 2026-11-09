import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { EAS_PROJECT_ID } from '../config';
import { api } from '../lib/api';

// Smart reminders are decided on the server (it knows whether you're behind
// on water, have logged a workout, ...) and delivered through Expo's push
// service. This file registers the phone and shows reminders in the foreground.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Server reminder URLs are web paths; map them to app routes
const ROUTES: Record<string, string> = {
  '/water': '/water',
  '/training': '/training',
  '/nutrition': '/nutrition',
  '/sleep': '/sleep',
  '/progress': '/progress',
  '/profile': '/reminders',
};
export const routeForNotification = (url?: unknown) => (typeof url === 'string' && ROUTES[url]) || '/';

export type PushResult = { ok: true; token: string } | { ok: false; reason: string };

export async function registerForReminders(): Promise<PushResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'Phone notifications work in the Android and iPhone apps.' };
  if (!Device.isDevice) return { ok: false, reason: 'Push notifications need a physical phone (not an emulator).' };
  if (!EAS_PROJECT_ID) return { ok: false, reason: 'This build has no EAS project id. Run `eas init` and rebuild to enable push.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { ok: false, reason: 'Notifications are turned off for FitPulse in your phone settings.' };

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  await api.post('/reminders/devices', { type: 'expo', token });
  return { ok: true, token };
}

export async function unregisterReminders(token: string) {
  await api.del('/reminders/devices', { endpoint: token }).catch(() => {});
}
