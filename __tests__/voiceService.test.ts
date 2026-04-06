// expo-av is mocked globally via __mocks__/expo-av.js
import {
  startVoiceRecording,
  stopVoiceRecording,
  cancelVoiceRecording,
  isRecording,
} from '../src/services/voice/voiceService';

const { Audio } = require('expo-av');

// Helper to reset the module-level `recording` variable between tests
async function resetRecording() {
  if (isRecording()) {
    await cancelVoiceRecording();
  }
}

beforeEach(async () => {
  jest.clearAllMocks();
  Audio.requestPermissionsAsync.mockResolvedValue({ granted: true });
  await resetRecording();
});

describe('voiceService', () => {
  describe('isRecording', () => {
    it('returns false when not recording', () => {
      expect(isRecording()).toBe(false);
    });

    it('returns true while recording', async () => {
      await startVoiceRecording();
      expect(isRecording()).toBe(true);
    });
  });

  describe('startVoiceRecording', () => {
    it('requests microphone permissions', async () => {
      await startVoiceRecording();
      expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('throws when microphone permission is denied', async () => {
      Audio.requestPermissionsAsync.mockResolvedValue({ granted: false });
      await expect(startVoiceRecording()).rejects.toThrow('Microphone permission denied');
    });

    it('sets iOS audio mode to allow recording', async () => {
      await startVoiceRecording();
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    });

    it('creates a recording via Audio.Recording.createAsync', async () => {
      await startVoiceRecording();
      expect(Audio.Recording.createAsync).toHaveBeenCalledWith(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
    });

    it('sets isRecording to true on success', async () => {
      await startVoiceRecording();
      expect(isRecording()).toBe(true);
    });
  });

  describe('stopVoiceRecording', () => {
    it('returns null when not recording', async () => {
      const uri = await stopVoiceRecording();
      expect(uri).toBeNull();
    });

    it('stops recording and returns URI', async () => {
      await startVoiceRecording();
      const uri = await stopVoiceRecording();

      const mockRec = Audio.Recording.createAsync.mock.results[0]?.value;
      expect(uri).toBe('file:///mock-audio.m4a');
    });

    it('sets isRecording to false after stopping', async () => {
      await startVoiceRecording();
      await stopVoiceRecording();
      expect(isRecording()).toBe(false);
    });

    it('resets iOS audio mode after stopping', async () => {
      await startVoiceRecording();
      jest.clearAllMocks();
      await stopVoiceRecording();
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({ allowsRecordingIOS: false });
    });
  });

  describe('cancelVoiceRecording', () => {
    it('is a no-op when not recording', async () => {
      await expect(cancelVoiceRecording()).resolves.not.toThrow();
    });

    it('stops recording without returning URI', async () => {
      await startVoiceRecording();
      await cancelVoiceRecording();
      expect(isRecording()).toBe(false);
    });

    it('resets iOS audio mode after cancel', async () => {
      await startVoiceRecording();
      jest.clearAllMocks();
      await cancelVoiceRecording();
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({ allowsRecordingIOS: false });
    });
  });
});
