import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { ROLE_CONFIG } from '@/constants';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={ROLE_CONFIG[user.role].dashboardRoute as any} />;
}
