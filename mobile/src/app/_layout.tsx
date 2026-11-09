import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../lib/auth';
import { useColors } from '../lib/theme';
import { Loading } from '../components/ui';
import { routeForNotification } from '../notifications/push';
import { syncHealth } from '../health/sync';

// Tapping a reminder opens the matching screen
function NotificationRouter() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = Notifications.addNotificationResponseReceivedListener(res => {
      router.push(routeForNotification(res.notification.request.content.data?.url) as never);
    });
    return () => sub.remove();
  }, []);
  return null;
}

// Once health sync is connected, top up the last 3 days whenever the app
// comes to the foreground (at most once an hour).
function AutoHealthSync() {
  const { user, refreshUser } = useAuth();
  const last = user?.healthSync?.lastSyncAt;
  useEffect(() => {
    if (Platform.OS === 'web' || !last) return undefined;
    let running = false;
    const maybeSync = () => {
      if (running || Date.now() - new Date(last).getTime() < 60 * 60 * 1000) return;
      running = true;
      syncHealth(3).then(() => refreshUser()).catch(() => {}).finally(() => { running = false; });
    };
    maybeSync();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') maybeSync(); });
    return () => sub.remove();
  }, [last, refreshUser]);
  return null;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const c = useColors();
  if (loading) return <Loading />;
  const signedIn = Boolean(user);
  const onboarded = Boolean(user?.profile?.age);

  const header = {
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.ink,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '800' as const },
    contentStyle: { backgroundColor: c.bg },
  };

  return (
    <>
      <StatusBar style="auto" />
      {signedIn && <NotificationRouter />}
      {signedIn && <AutoHealthSync />}
      <Stack screenOptions={{ ...header, headerShown: false }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="water" options={{ headerShown: true, title: 'Hydration' }} />
          <Stack.Screen name="sleep" options={{ headerShown: true, title: 'Sleep' }} />
          <Stack.Screen name="steps" options={{ headerShown: true, title: 'Activity' }} />
          <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profile & goals' }} />
          <Stack.Screen name="reminders" options={{ headerShown: true, title: 'Smart reminders' }} />
          <Stack.Screen name="health" options={{ headerShown: true, title: 'Health sync' }} />
          <Stack.Screen name="log-food" options={{ headerShown: true, title: 'Log food', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
