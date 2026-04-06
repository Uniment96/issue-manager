import { Audio } from 'expo-av';

let recording: Audio.Recording | null = null;

export async function startVoiceRecording(): Promise<void> {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) throw new Error('Microphone permission denied');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

export async function stopVoiceRecording(): Promise<string | null> {
  if (!recording) return null;
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return uri;
}

export async function cancelVoiceRecording(): Promise<void> {
  if (!recording) return;
  await recording.stopAndUnloadAsync();
  recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
}

export function isRecording(): boolean {
  return recording !== null;
}
