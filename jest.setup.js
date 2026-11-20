// Mock global do AsyncStorage: os providers de locações, favoritos e cartões
// agora gravam os dados do usuário no aparelho.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
