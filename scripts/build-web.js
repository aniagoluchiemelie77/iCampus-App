const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(
  path.join(root, 'public', 'index.html'),
  path.join(dist, 'index.html'),
);

// Icon fonts referenced by @font-face in public/index.html.
const fonts = path.join(dist, 'fonts');
fs.mkdirSync(fonts, { recursive: true });
for (const font of [
  'react-native-vector-icons/Fonts/MaterialIcons.ttf',
  'react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
  '@ant-design/icons-react-native/fonts/antfill.ttf',
  '@ant-design/icons-react-native/fonts/antoutline.ttf',
]) {
  fs.copyFileSync(
    path.join(root, 'node_modules', font),
    path.join(fonts, path.basename(font)),
  );
}

const result = spawnSync(
  path.join(root, 'node_modules', '.bin', 'react-native.cmd'),
  [
    'bundle',
    '--reset-cache',
    '--platform',
    'web',
    '--dev',
    'false',
    '--entry-file',
    'index.web.js',
    '--bundle-output',
    path.join(dist, 'bundle.js'),
    '--assets-dest',
    path.join(dist, 'assets'),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    // Tells metro.config.js to skip native-only startup code (see there).
    env: { ...process.env, ICAMPUS_WEB_BUILD: '1' },
  },
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}
