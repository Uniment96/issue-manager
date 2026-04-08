// Use fake timers globally — prevents setTimeout/setInterval from keeping
// the Jest process alive after tests finish (e.g. uiStore's showToast auto-dismiss).
jest.useFakeTimers();

// Silence console.warn in tests (can re-enable per-test with jest.spyOn)
global.console.warn = jest.fn();
