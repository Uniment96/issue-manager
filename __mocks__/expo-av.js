const mockRecording = {
  stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
  getURI: jest.fn().mockReturnValue('file:///mock-audio.m4a'),
};

module.exports = {
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: {
      createAsync: jest.fn().mockResolvedValue({ recording: mockRecording }),
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
    },
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
};
