import { Stack } from 'expo-router';
import { COLORS } from '@/constants';

export default function ManagerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-staff"
        options={{
          headerShown: true,
          title: 'Add Staff Member',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="dish/[id]" />
    </Stack>
  );
}
