import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
import {
  onAuthChanged,
  fetchUserProfile,
  updateFcmToken,
} from '@/services/firebase/authService';
import { startSyncListener } from '@/services/offline/syncService';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '@/services/notifications/notificationService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import Toast from '@/components/Toast';
import OfflineBanner from '@/components/OfflineBanner';

export default function RootLayout() {
  const { setUser, restoreSession, user } = useAuthStore();

  useNetworkStatus();

  useEffect(() => {
    restoreSession();
    const unsubAuth = onAuthChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await fetchUserProfile(fbUser.uid);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubSync = startSyncListener(user.uid, user.displayName);

    registerForPushNotifications().then((token) => {
      if (token) updateFcmToken(user.uid, token).catch(() => null);
    });

    const receivedSub = addNotificationReceivedListener((_n) => {
      // Foreground notifications handled here if needed
    });
    const responseSub = addNotificationResponseListener((_r) => {
      // Handle notification tap (deep link) here if needed
    });

    return () => {
      unsubSync();
      receivedSub.remove();
      responseSub.remove();
    };
  }, [user?.uid]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(waiter)" />
        <Stack.Screen name="(chef)" />
        <Stack.Screen name="(supervisor)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen
          name="issue/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Issue Detail',
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
      <OfflineBanner />
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
