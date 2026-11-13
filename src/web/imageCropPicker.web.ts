/// <reference lib="dom" />
/**
 * Web stand-in for react-native-image-crop-picker (see metro.config.js).
 *
 * The native package has no browser build. It used to resolve to the no-op
 * stub, so `openPicker()` returned at once with a fake `path`, and screens
 * showed their confirm modal without the user picking anything.
 *
 * This opens the browser's file dialog instead and returns the same result
 * shape (`path`, `mime`, `size`, `width`, `height`, `filename`). With
 * `cropping: true` it shows the interactive cropper (imageCropper.web.ts),
 * like the native UCrop / TOCropViewController screens, and returns an image
 * of exactly `width` x `height`. Cancelling the cropper cancels the pick.
 * `compressImageQuality` and `compressImageMaxWidth/Height` are applied with
 * a canvas. `path` is a blob: URL that <Image>, fetch() and the upload
 * helpers can read.
 */
import { chooseFiles, fileToUri, PickerCancelledError, revokeUri } from './pickFiles.web';
import { cropImageInteractively } from './imageCropper.web';

interface PickerOptions {
  mediaType?: 'photo' | 'video' | 'any';
  multiple?: boolean;
  maxFiles?: number;
  cropping?: boolean;
  width?: number;
  height?: number;
  compressImageQuality?: number;
  compressImageMaxWidth?: number;
  compressImageMaxHeight?: number;
  includeBase64?: boolean;
  path?: string;
  cropperCircleOverlay?: boolean;
  cropperToolbarTitle?: string;
  cropperChooseText?: string;
  cropperCancelText?: string;
}

export interface WebPickedImage {
  path: string;
  sourceURL: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  filename: string;
  modificationDate?: string;
  data?: string | null;
}

const cancelled = () =>
  new PickerCancelledError('User cancelled image selection', 'E_PICKER_CANCELLED');

const acceptFor = (mediaType: PickerOptions['mediaType'] = 'any') =>
  mediaType === 'photo' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'image/*,video/*';

const loadImage = async (blob: Blob): Promise<CanvasImageSource & { width: number; height: number }> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Fall through to <img> (e.g. formats only the <img> decoder handles).
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image.'));
    };
    img.src = url;
  });
};

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Crops (interactively)/resizes/compresses an image file per the picker options. */
const processImage = async (file: Blob, name: string, options: PickerOptions): Promise<WebPickedImage> => {
  const wantsCrop = !!options.cropping && !options.multiple;
  const quality = options.compressImageQuality;
  const maxW = options.compressImageMaxWidth;
  const maxH = options.compressImageMaxHeight;

  let image: (CanvasImageSource & { width: number; height: number }) | null = null;
  try {
    image = await loadImage(file);
  } catch {
    // Undecodable in this browser (e.g. HEIC outside Safari).
  }

  if (!image) {
    if (wantsCrop) {
      throw new Error("This image format can't be opened in the browser. Try a JPEG or PNG.");
    }
    return finish(file, name, 0, 0, options);
  }

  let drawable: CanvasImageSource & { width: number; height: number } = image;
  if (wantsCrop && !/svg/i.test(file.type)) {
    // Throws the picker's cancel error if the user backs out.
    drawable = await cropImageInteractively(image, {
      width: options.width,
      height: options.height,
      circle: options.cropperCircleOverlay,
      title: options.cropperToolbarTitle,
      chooseText: options.cropperChooseText,
      cancelText: options.cropperCancelText,
      cancelError: cancelled,
    });
  }
  const width = drawable.width;
  const height = drawable.height;
  const needsEncode =
    drawable !== image || (quality !== undefined && quality < 1) || !!maxW || !!maxH;

  if (!needsEncode || /gif|svg/i.test(file.type)) {
    closeBitmap(image);
    return finish(file, name, width, height, options);
  }

  const fit = Math.min(1, (maxW ?? Infinity) / width, (maxH ?? Infinity) / height);
  const outW = Math.max(1, Math.round(width * fit));
  const outH = Math.max(1, Math.round(height * fit));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  let output: Blob | null = null;
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawable, 0, 0, outW, outH);
    output = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality ?? 0.9));
  }
  closeBitmap(image);
  if (!output) return finish(file, name, width, height, options);
  return finish(output, name.replace(/\.[^.]+$/, '') + '.jpg', outW, outH, options);
};

const closeBitmap = (image: any) => {
  if (image && typeof image.close === 'function') image.close();
};

const finish = async (
  blob: Blob,
  name: string,
  width: number,
  height: number,
  options: PickerOptions,
): Promise<WebPickedImage> => {
  const path = fileToUri(blob, name);
  return {
    path,
    sourceURL: path,
    mime: blob.type || 'image/jpeg',
    size: blob.size,
    width,
    height,
    filename: name,
    modificationDate: String(Date.now()),
    data: options.includeBase64 ? await toBase64(blob) : null,
  };
};

const toResult = (file: File, options: PickerOptions): Promise<WebPickedImage> => {
  if (file.type.startsWith('image/')) return processImage(file, file.name, options);
  const path = fileToUri(file, file.name);
  return Promise.resolve({
    path,
    sourceURL: path,
    mime: file.type,
    size: file.size,
    width: 0,
    height: 0,
    filename: file.name,
    modificationDate: String(file.lastModified),
  });
};

const pick = async (options: PickerOptions = {}, capture?: 'environment' | 'user') => {
  const files = await chooseFiles({
    accept: acceptFor(options.mediaType),
    multiple: !!options.multiple,
    capture,
    cancelError: cancelled,
  });
  const limited = options.multiple && options.maxFiles ? files.slice(0, options.maxFiles) : files;
  const results = await Promise.all(limited.map(file => toResult(file, options)));
  return options.multiple ? results : results[0];
};

const ImagePicker = {
  openPicker: (options?: PickerOptions): Promise<any> => pick(options),
  // Opens the camera on phones; desktop browsers show the file dialog.
  openCamera: (options?: PickerOptions): Promise<any> => pick(options, 'environment'),
  openCropper: async (options: PickerOptions): Promise<WebPickedImage> => {
    if (!options.path) throw new Error('openCropper needs a path');
    const blob = await (await fetch(options.path)).blob();
    const name = decodeURIComponent(options.path.split('#')[1] || 'image.jpg');
    return processImage(blob, name, { ...options, cropping: true });
  },
  clean: async () => {},
  cleanSingle: async (path: string) => revokeUri(path),
};

export const { openPicker, openCamera, openCropper, clean, cleanSingle } = ImagePicker;
export default ImagePicker;
