const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Set by scripts/build-web.js. Metro's default runs React Native's native
// InitializeCore before the app; in a browser that throws
// "__fbBatchedBridgeConfig is not set" and leaves a blank white page.
const isWebBuild = process.env.ICAMPUS_WEB_BUILD === '1';

// Native-only packages with no web code. On web they resolve to a no-op
// stub (see src/web/nativeModuleStub.js), so the app loads and those
// features are simply unavailable in the browser.
const WEB_STUBBED_PACKAGES = [
  '@bam.tech/react-native-image-resizer',
  '@react-native-community/datetimepicker',
  '@react-native-firebase/app',
  '@react-native-firebase/messaging',
  'react-native-agora',
  'react-native-app-auth',
  'react-native-biometrics',
  'react-native-ble-manager',
  'react-native-ble-peripheral',
  'react-native-date-picker',
  'react-native-device-info',
  'react-native-fs',
  'react-native-geolocation-service',
  'react-native-html-to-pdf',
  'react-native-nitro-image',
  'react-native-nitro-modules',
  'react-native-permissions',
  'react-native-persona',
  'react-native-rate',
  'react-native-sound',
  'react-native-vision-camera',
  'react-native-vision-camera-face-detector',
];
// Native-only components that wrap content: real web versions instead.
const WEB_REPLACEMENTS = {
  '@react-native-community/blur': './src/components/BlurView.web.tsx',
  'react-native-calendar-events': './src/services/calendarEvents.web.ts',
  'react-native-linear-gradient': './src/web/LinearGradient.web.tsx',
  'react-native-pager-view': './src/web/PagerView.web.tsx',
  // Real browser versions of native-only packages the app depends on.
  // SQLite holds the product cache (Favorites, Cart, Product Detail...).
  'react-native-quick-sqlite': './src/web/quickSqlite.web.ts',
  // File dialogs: the stub returned a fake file at once, so screens opened
  // their confirm step without the user picking anything.
  'react-native-image-crop-picker': './src/web/imageCropPicker.web.ts',
  '@react-native-documents/picker': './src/web/documentPicker.web.ts',
  // File saving/reading: "save to Downloads" becomes a browser download.
  'react-native-blob-util': './src/web/blobUtil.web.ts',
};
const isPackage = (moduleName, pkg) =>
  moduleName === pkg || moduleName.startsWith(`${pkg}/`);

const config = {
  ...(isWebBuild && {
    serializer: {
      getModulesRunBeforeMainModule: () => [],
    },
  }),
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: getDefaultConfig(__dirname).resolver.assetExts.filter(
      ext => ext !== 'svg',
    ),
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'svg'],
    platforms: [...getDefaultConfig(__dirname).resolver.platforms, 'web'],
    resolveRequest: (baseContext, moduleName, platform) => {
      // On web, use a package's plain .js files, not its .native.js ones
      // (e.g. AsyncStorage's .native.js calls TurboModuleRegistry, which
      // react-native-web doesn't have). Metro hard-codes this to true, so
      // it can only be changed here, per request.
      const context =
        platform === 'web'
          ? { ...baseContext, preferNativePlatform: false }
          : baseContext;
      if (platform === 'web') {
        const replacement = Object.keys(WEB_REPLACEMENTS).find(
          pkg => moduleName === pkg,
        );
        if (replacement) {
          return context.resolveRequest(
            context,
            require.resolve(WEB_REPLACEMENTS[replacement]),
            platform,
          );
        }
        if (WEB_STUBBED_PACKAGES.some(pkg => isPackage(moduleName, pkg))) {
          return {
            type: 'sourceFile',
            filePath: require.resolve('./src/web/nativeModuleStub.js'),
          };
        }
      }

      if (platform === 'web' && moduleName === 'react-native') {
        // react-native-web, with a Modal that keeps sheets and dialogs to a
        // sensible width on desktop (see src/web/reactNative.web.js).
        return {
          type: 'sourceFile',
          filePath: require.resolve('./src/web/reactNative.web.js'),
        };
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