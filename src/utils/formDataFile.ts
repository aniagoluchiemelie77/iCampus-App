import { Platform } from 'react-native';

export interface FilePart {
  uri: string;
  name: string;
  type?: string;
}

const extensionOf = (uri: string) => {
  // blob: URIs from the web pickers carry the file name as a #fragment.
  const name = decodeURIComponent(uri.split('#')[1] || uri.split('?')[0].split('/').pop() || '');
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/**
 * Builds the `file` value for FormData on either platform.
 *
 * React Native's FormData takes `{ uri, name, type }` and reads the file
 * itself. Browsers do not: that object is sent as the text
 * "[object Object]", so on web every upload failed. There we read the
 * (blob:/data:/http) URI into a real File first.
 */
export const toFormDataFile = async ({ uri, name, type }: FilePart): Promise<any> => {
  if (Platform.OS !== 'web') return { uri, name, type };
  const blob = await (await fetch(uri)).blob();
  return new File([blob], name, { type: blob.type || type || 'application/octet-stream' });
};

/** Appends a picked file to `formData` in the form the platform needs. */
export const appendFile = async (formData: FormData, field: string, file: FilePart) => {
  formData.append(field, await toFormDataFile(file));
};

/** MIME type guess from a URI's extension, for uploads that must state one. */
export const mimeFromUri = (uri: string, fallback: 'image' | 'video' | 'file' = 'image') => {
  const ext = extensionOf(uri);
  if (!ext) return fallback === 'video' ? 'video/mp4' : fallback === 'image' ? 'image/jpeg' : 'application/octet-stream';
  if (ext === 'jpg') return 'image/jpeg';
  if (['png', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'bmp'].includes(ext)) return `image/${ext}`;
  if (['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext)) {
    return ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
  }
  if (ext === 'pdf') return 'application/pdf';
  return fallback === 'video' ? `video/${ext}` : fallback === 'image' ? `image/${ext}` : 'application/octet-stream';
};

/** File extension for naming an upload (defaults by media kind). */
export const uploadExtension = (uri: string, mediaType: 'image' | 'video' = 'image') =>
  extensionOf(uri) || (mediaType === 'video' ? 'mp4' : 'jpg');
