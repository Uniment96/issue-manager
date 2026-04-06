import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useUIStore } from '../store/uiStore';

export function useNetworkStatus() {
  const setOnline = useUIStore((s) => s.setOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, [setOnline]);
}
