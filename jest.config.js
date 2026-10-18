module.exports = {
  preset: '@react-native/jest-preset',
  // The preset's own environment pins jest-environment-node@29, which is
  // incompatible with this project's Jest 30. Use Jest 30's node environment
  // with the same export conditions the preset's environment sets.
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['require', 'react-native'],
  },
};
