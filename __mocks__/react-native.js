module.exports = {
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (styles) => styles },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  SafeAreaView: 'SafeAreaView',
};
