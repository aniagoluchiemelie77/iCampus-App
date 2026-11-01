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
    platforms: [...getDefaultConfig(__dirname).resolver.platforms, 'web'],
    resolveRequest: (context, moduleName, platform) => {
      if (
        platform === 'web' &&
        moduleName === '@react-native-community/blur'
      ) {
        return context.resolveRequest(
          context,
          require.resolve('./src/components/BlurView.web.tsx'),
          platform,
        );
      }

      if (platform === 'web' && moduleName === 'react-native-calendar-events') {
        return context.resolveRequest(
          context,
          require.resolve('./src/services/calendarEvents.web.ts'),
          platform,
        );
      }

      if (platform === 'web' && moduleName === 'react-native') {
        return context.resolveRequest(context, 'react-native-web', platform);
      }

      return context.resolveRequest(context, moduleName, platform);
    },
    blockList: [
      /[\\/]node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/]/,
      /[\\/]node_modules[\\/].*[\\/]ios[\\/]build[\\/]/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
//npx eas-cli@latest build --profile production
//npx eas-cli build --platform ios --profile preview
//npx eas-cli build --platform android --profile production --clear-cache