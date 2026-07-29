const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: getDefaultConfig(__dirname).resolver.assetExts.filter(
      ext => ext !== 'svg',
    ),
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'svg'],
    blockList: [
      /[\\/]node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/]/,
      /[\\/]node_modules[\\/].*[\\/]ios[\\/]build[\\/]/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
//npx eas-cli@latest build --profile production
//npx eas-cli build --platform ios --profile preview