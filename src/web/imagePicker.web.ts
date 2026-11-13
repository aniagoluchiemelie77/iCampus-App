/// <reference lib="dom" />
/**
 * Web stand-in for react-native-image-picker (see metro.config.js).
 *
 * The package's own web build rejects every mediaType except 'photo'
 * ("For now, only photo mediaType is supported for web"), so picking
 * 'mixed' from the gallery or recording a video failed in the browser.
 *
 * This opens the browser's file dialog for any media type and returns the
 * same response shape ({ assets: [{ uri, type, fileName, fileSize, width,
 * height, duration }] }). `uri` is a blob: URL with the file name as a
 * #fragment, which <Image>, <Video> and the upload helpers already read.
 *
 * Camera: on phones the `capture` attribute opens the camera / camcorder.
 * On desktop, photos use the package's webcam overlay; video falls back to
 * choosing a file (browsers have no "record video" file input on desktop).
 */
import type {
  Asset,
  Callback,
  CameraOptions,
  ImageLibraryOptions,
  ImagePickerResponse,
  MediaType,
} from 'react-native-image-picker/src/types';
import { chooseFiles, fileToUri, PickerCancelledError } from './pickFiles.web';
// The package's own web camera (webcam overlay), used for desktop photos.
import { camera as packageWebCamera } from 'react-native-image-picker/src/platforms/web';

export * from 'react-native-image-picker/src/types';

const cancelled = () => new PickerCancelledError('User cancelled', 'cancelled');

const acceptFor = (mediaType: MediaType = 'photo') =>
  mediaType === 'photo'
    ? 'image/*'
    : mediaType === 'video'
      ? 'video/*'
      : 'image/*,video/*';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(pointer: coarse)').matches;

const readImageSize = (url: string) =>
  new Promise<{ width?: number; height?: number }>(resolve => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = url;
  });

const readVideoMeta = (url: string) =>
  new Promise<{ width?: number; height?: number; duration?: number }>(
    resolve => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      const done = (meta: {
        width?: number;
        height?: number;
        duration?: number;
      }) => {
        video.removeAttribute('src');
        video.load();
        resolve(meta);
      };
      video.onloadedmetadata = () =>
        done({
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
          duration: Number.isFinite(video.duration)
            ? video.duration
            : undefined,
        });
      video.onerror = () => done({});
      video.src = url;
    },
  );

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const toAsset = async (file: File, includeBase64?: boolean): Promise<Asset> => {
  const uri = fileToUri(file, file.name);
  const plainUrl = uri.split('#')[0];
  const isVideo = file.type.startsWith('video/');
  const meta = isVideo
    ? await readVideoMeta(plainUrl)
    : await readImageSize(plainUrl);
  return {
    uri,
    type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileName: file.name,
    fileSize: file.size,
    ...meta,
    ...(includeBase64 && !isVideo ? { base64: await toBase64(file) } : {}),
  };
};

const pick = async (
  {
    accept,
    multiple,
    capture,
    includeBase64,
    limit,
  }: {
    accept: string;
    multiple: boolean;
    capture?: 'environment' | 'user';
    includeBase64?: boolean;
    limit?: number;
  },
  callback?: Callback,
): Promise<ImagePickerResponse> => {
  let result: ImagePickerResponse;
  try {
    const files = await chooseFiles({
      accept,
      multiple,
      capture,
      cancelError: cancelled,
    });
    const chosen = limit && limit > 0 ? files.slice(0, limit) : files;
    result = {
      didCancel: false,
      assets: await Promise.all(chosen.map(f => toAsset(f, includeBase64))),
    };
  } catch (error) {
    result =
      error instanceof PickerCancelledError
        ? { didCancel: true }
        : {
            errorCode: 'others',
            errorMessage:
              (error as Error)?.message || 'Could not read the file.',
          };
  }
  callback?.(result);
  return result;
};

export const launchImageLibrary = (
  options: ImageLibraryOptions,
  callback?: Callback,
): Promise<ImagePickerResponse> => {
  // selectionLimit: 0 means "no limit" in react-native-image-picker.
  const limit = options.selectionLimit ?? 1;
  return pick(
    {
      accept: acceptFor(options.mediaType),
      multiple: limit !== 1,
      includeBase64: options.includeBase64,
      limit,
    },
    callback,
  );
};

export const launchCamera = (
  options: CameraOptions,
  callback?: Callback,
): Promise<ImagePickerResponse> => {
  const mediaType = options.mediaType ?? 'photo';
  if (mediaType === 'photo' && !isTouchDevice()) {
    return packageWebCamera(options, callback);
  }
  return pick(
    {
      accept: acceptFor(mediaType === 'mixed' ? 'mixed' : mediaType),
      multiple: false,
      capture: options.cameraType === 'front' ? 'user' : 'environment',
      includeBase64: options.includeBase64,
    },
    callback,
  );
};
