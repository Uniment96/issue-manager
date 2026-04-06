import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UIState {
  isOnline: boolean;
  toast: Toast | null;
  isVoiceRecording: boolean;

  setOnline: (online: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  setVoiceRecording: (recording: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  toast: null,
  isVoiceRecording: false,

  setOnline: (isOnline) => set({ isOnline }),

  showToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set({ toast: { id, message, type } });
    // Auto-dismiss after 3 seconds
    setTimeout(() => set((state) => (state.toast?.id === id ? { toast: null } : {})), 3000);
  },

  hideToast: () => set({ toast: null }),

  setVoiceRecording: (isVoiceRecording) => set({ isVoiceRecording }),
}));
