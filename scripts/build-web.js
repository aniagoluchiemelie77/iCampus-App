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
  { cwd: root, stdio: 'inherit', shell: true },
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}
