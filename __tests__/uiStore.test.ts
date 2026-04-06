import { useUIStore } from '../src/store/uiStore';

beforeEach(() => {
  // Reset store state before each test
  useUIStore.setState({
    isOnline: true,
    toast: null,
    isVoiceRecording: false,
  });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('uiStore', () => {
  describe('setOnline', () => {
    it('sets isOnline to false', () => {
      useUIStore.getState().setOnline(false);
      expect(useUIStore.getState().isOnline).toBe(false);
    });

    it('sets isOnline to true', () => {
      useUIStore.setState({ isOnline: false });
      useUIStore.getState().setOnline(true);
      expect(useUIStore.getState().isOnline).toBe(true);
    });
  });

  describe('showToast', () => {
    it('sets toast with message and type', () => {
      useUIStore.getState().showToast('Hello', 'success');
      const { toast } = useUIStore.getState();
      expect(toast).not.toBeNull();
      expect(toast?.message).toBe('Hello');
      expect(toast?.type).toBe('success');
      expect(toast?.id).toBeTruthy();
    });

    it('defaults type to info', () => {
      useUIStore.getState().showToast('Info message');
      expect(useUIStore.getState().toast?.type).toBe('info');
    });

    it('auto-dismisses after 3 seconds', () => {
      useUIStore.getState().showToast('Temporary', 'warning');
      expect(useUIStore.getState().toast).not.toBeNull();

      jest.advanceTimersByTime(3000);
      expect(useUIStore.getState().toast).toBeNull();
    });

    it('does not dismiss if a newer toast was shown', () => {
      useUIStore.getState().showToast('First', 'info');
      jest.advanceTimersByTime(1000);
      useUIStore.getState().showToast('Second', 'success');
      jest.advanceTimersByTime(2000); // 2s after first, 1s into second's timer

      // Second toast should still be visible (its 3s hasn't elapsed)
      expect(useUIStore.getState().toast?.message).toBe('Second');
    });
  });

  describe('hideToast', () => {
    it('clears the toast', () => {
      useUIStore.getState().showToast('visible');
      useUIStore.getState().hideToast();
      expect(useUIStore.getState().toast).toBeNull();
    });
  });

  describe('setVoiceRecording', () => {
    it('sets isVoiceRecording to true', () => {
      useUIStore.getState().setVoiceRecording(true);
      expect(useUIStore.getState().isVoiceRecording).toBe(true);
    });

    it('sets isVoiceRecording to false', () => {
      useUIStore.setState({ isVoiceRecording: true });
      useUIStore.getState().setVoiceRecording(false);
      expect(useUIStore.getState().isVoiceRecording).toBe(false);
    });
  });
});
