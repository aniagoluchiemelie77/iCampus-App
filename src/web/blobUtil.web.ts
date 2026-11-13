/// <reference lib="dom" />
/**
 * Web stand-in for react-native-blob-util (see metro.config.js).
 *
 * The native package writes into the device's Downloads folder. A browser
 * has no file system to write to, so here "saving to Downloads" is a normal
 * browser download (the browser puts it in the user's Downloads folder):
 *
 *   config({ path | addAndroidDownloads }).fetch('GET', url, headers)
 *       -> fetches the file and downloads it under the path's file name
 *   fs.writeFile(path, data, 'utf8' | 'base64')
 *       -> downloads `data` as a file named like `path`
 *   fs.readFile(uri, 'base64' | 'utf8')
 *       -> reads a blob:/data:/http(s) URI (e.g. a file from the web picker)
 *   ios.previewDocument / android.actionViewIntent
 *       -> opens the file in a new tab
 *
 * Paths under fs.dirs are virtual; only their file name is used.
 */

const DIRS = {
  DocumentDir: '/documents',
  CacheDir: '/cache',
  DownloadDir: '/downloads',
  PictureDir: '/pictures',
  MovieDir: '/movies',
  MusicDir: '/music',
  DCIMDir: '/dcim',
  MainBundleDir: '/bundle',
  LibraryDir: '/library',
  SDCardDir: '/sdcard',
  SDCardApplicationDir: '/sdcard',
  LegacyDownloadDir: '/downloads',
  LegacyPictureDir: '/pictures',
  LegacyMovieDir: '/movies',
  LegacyMusicDir: '/music',
  LegacyDCIMDir: '/dcim',
  LegacySDCardDir: '/sdcard',
};

const baseName = (path?: string, fallback = 'download') => {
  const name = (path || '').split('#')[0].split('?')[0].split(/[\\/]/).pop();
  return name ? decodeURIComponent(name) : fallback;
};

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const mimeFor = (name: string) =>
  MIME_BY_EXT[name.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';

/** Hands a blob to the browser as a file download. */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before freeing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const base64ToBytes = (b64: string) => {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// Files "written" this session, so a later readFile/exists of the same path works.
const memoryFiles = new Map<string, Blob>();

const readUri = async (path: string): Promise<Blob> => {
  const saved = memoryFiles.get(path);
  if (saved) return saved;
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not read ${baseName(path)} (${response.status})`);
  return response.blob();
};

interface FetchConfig {
  path?: string;
  fileCache?: boolean;
  appendExt?: string;
  addAndroidDownloads?: { path?: string; title?: string; mime?: string };
}

const makeResponse = (blob: Blob, status: number, headers: Record<string, string>, path?: string) => ({
  data: path ?? '',
  respInfo: { status, headers, redirects: [], respType: 'blob', state: '2', taskId: '', timeout: false, rnfbEncode: 'path' },
  info: () => ({ status, headers }),
  path: () => path ?? '',
  blob: async () => blob,
  text: () => blob.text(),
  json: async () => JSON.parse(await blob.text()),
  base64: () => blobToBase64(blob),
  flush: async () => {
    if (path) memoryFiles.delete(path);
  },
  readFile: (encoding: string = 'utf8') => (encoding === 'base64' ? blobToBase64(blob) : blob.text()),
  session: () => {},
});

const doFetch = (options: FetchConfig) => (
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any,
) => {
  const run = async () => {
    const cleanHeaders: Record<string, string> = {};
    Object.entries(headers || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) cleanHeaders[k] = String(v);
    });
    const requestBody =
      typeof body === 'string' || body instanceof Blob || body instanceof FormData
        ? body
        : body
          ? JSON.stringify(body)
          : undefined;
    const isGet = method.toUpperCase() === 'GET';
    let response: Response;
    try {
      response = await fetch(url, { method, headers: cleanHeaders, body: requestBody });
    } catch (error) {
      // A network error here is almost always CORS. Signed storage links
      // (PDF reports) reject the preflight an Authorization header causes,
      // and don't need it, so retry a GET once without headers.
      try {
        if (!isGet || Object.keys(cleanHeaders).length === 0) throw error;
        response = await fetch(url);
      } catch {
        // Last resort for file downloads: open the link and let the
        // browser download it itself.
        const wantsFile = !!(options.path || options.addAndroidDownloads);
        if (isGet && wantsFile) {
          window.open(url, '_blank', 'noopener');
          return makeResponse(new Blob(), 200, {}, options.path);
        }
        throw error;
      }
    }
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => (responseHeaders[k] = v));

    const targetPath = options.addAndroidDownloads?.path || options.path;
    if (targetPath || options.addAndroidDownloads) {
      // The native version saves into Downloads; the browser equivalent is a download.
      const fileName =
        baseName(targetPath, '') ||
        options.addAndroidDownloads?.title ||
        baseName(url, 'download') + (options.appendExt ? `.${options.appendExt}` : '');
      const mime = options.addAndroidDownloads?.mime || blob.type || mimeFor(fileName);
      const typed = blob.type ? blob : new Blob([blob], { type: mime });
      saveBlob(typed, fileName);
      if (targetPath) memoryFiles.set(targetPath, typed);
    }
    return makeResponse(blob, response.status, responseHeaders, targetPath);
  };

  // The native task is a promise with extra progress/cancel methods.
  const task: any = run();
  task.progress = () => task;
  task.uploadProgress = () => task;
  task.expire = () => task;
  task.stateChange = () => task;
  task.cancel = () => {};
  return task;
};

const fs = {
  dirs: DIRS,
  /** Writing into a folder means the user should get the file: download it. */
  writeFile: async (path: string, data: string | number[], encoding: string = 'utf8') => {
    const name = baseName(path);
    const bytes =
      encoding === 'base64'
        ? base64ToBytes(String(data))
        : encoding === 'ascii' && Array.isArray(data)
          ? new Uint8Array(data)
          : String(data);
    const blob = new Blob([bytes], { type: mimeFor(name) });
    memoryFiles.set(path, blob);
    saveBlob(blob, name);
    return blob.size;
  },
  appendFile: async (path: string, data: string, encoding: string = 'utf8') => {
    const previous = memoryFiles.get(path);
    const addition = encoding === 'base64' ? base64ToBytes(data) : data;
    memoryFiles.set(path, new Blob(previous ? [previous, addition] : [addition], { type: mimeFor(baseName(path)) }));
    return 0;
  },
  readFile: async (path: string, encoding: string = 'utf8') => {
    const blob = await readUri(path);
    if (encoding === 'base64') return blobToBase64(blob);
    if (encoding === 'ascii') return Array.from(new Uint8Array(await blob.arrayBuffer()));
    return blob.text();
  },
  exists: async (path: string) => memoryFiles.has(path) || /^(blob:|data:|https?:)/.test(path),
  isDir: async (path: string) => Object.values(DIRS).includes(path),
  unlink: async (path: string) => {
    memoryFiles.delete(path);
  },
  mkdir: async () => {},
  ls: async (dir: string) =>
    Array.from(memoryFiles.keys())
      .filter(p => p.startsWith(`${dir}/`))
      .map(p => baseName(p)),
  stat: async (path: string) => {
    const blob = await readUri(path);
    return { path, filename: baseName(path), size: blob.size, type: 'file', lastModified: Date.now() };
  },
  cp: async (from: string, to: string) => {
    memoryFiles.set(to, await readUri(from));
    return true;
  },
  mv: async (from: string, to: string) => {
    memoryFiles.set(to, await readUri(from));
    memoryFiles.delete(from);
    return true;
  },
  df: async () => ({ free: 0, total: 0 }),
  scanFile: async () => {},
};

const openInTab = (path: string) => {
  const saved = memoryFiles.get(path);
  window.open(saved ? URL.createObjectURL(saved) : path, '_blank', 'noopener');
};

const ReactNativeBlobUtil = {
  config: (options: FetchConfig = {}) => ({ fetch: doFetch(options) }),
  fetch: doFetch({}),
  fs,
  base64: {
    encode: (text: string) => btoa(unescape(encodeURIComponent(text))),
    decode: (b64: string) => decodeURIComponent(escape(atob(b64))),
  },
  wrap: (path: string) => path,
  session: () => ({ add: () => {}, remove: () => {}, list: () => [], dispose: async () => {} }),
  ios: {
    previewDocument: openInTab,
    openDocument: openInTab,
    excludeFromBackupKey: async () => {},
  },
  android: {
    actionViewIntent: async (path: string) => openInTab(path),
    addCompleteDownload: async () => {},
    getSDCardDir: async () => DIRS.SDCardDir,
    getSDCardApplicationDir: async () => DIRS.SDCardDir,
  },
  MediaCollection: {},
};

export default ReactNativeBlobUtil;
export { fs };
