/// <reference lib="dom" />
/**
 * Web stand-in for @react-native-documents/picker (see metro.config.js).
 * Same API surface the app uses (`pick`, `types`, `errorCodes`,
 * `isErrorWithCode`, `keepLocalCopy`), backed by the browser's file dialog.
 * `uri` is a blob: URL that fetch() and the upload helpers can read.
 */
import { chooseFiles, fileToUri, PickerCancelledError } from './pickFiles.web';

export const types = {
  allFiles: '*/*',
  audio: 'audio/*',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  images: 'image/*',
  json: 'application/json',
  pdf: 'application/pdf',
  plainText: 'text/plain',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  video: 'video/*',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
} as const;

export const errorCodes = {
  OPERATION_CANCELED: 'OPERATION_CANCELED',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
} as const;

export const isErrorWithCode = (error: any): error is { code: string; message: string } =>
  !!error && typeof error === 'object' && typeof error.code === 'string';

interface PickOptions {
  type?: string | string[];
  allowMultiSelection?: boolean;
  mode?: 'import' | 'open';
}

export interface WebDocumentPickerResponse {
  uri: string;
  name: string;
  size: number;
  type: string;
  nativeType: string;
  error: null;
  hasRequestedType: boolean;
  isVirtual: boolean;
  convertibleToMimeTypes: null;
  /** Web only: the picked File, for code that wants it directly. */
  file: File;
}

let inProgress = false;

export const pick = async (options: PickOptions = {}): Promise<WebDocumentPickerResponse[]> => {
  if (inProgress) {
    throw new PickerCancelledError('A file picker is already open', errorCodes.IN_PROGRESS);
  }
  const typeList = ([] as string[]).concat(options.type ?? types.allFiles);
  const accept = typeList.includes(types.allFiles) ? undefined : typeList.join(',');
  inProgress = true;
  try {
    const files = await chooseFiles({
      accept,
      multiple: !!options.allowMultiSelection,
      cancelError: () =>
        new PickerCancelledError('User canceled document picker', errorCodes.OPERATION_CANCELED),
    });
    return files.map(file => ({
      uri: fileToUri(file, file.name),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      nativeType: file.type,
      error: null,
      hasRequestedType: true,
      isVirtual: false,
      convertibleToMimeTypes: null,
      file,
    }));
  } finally {
    inProgress = false;
  }
};

/** Files are already readable in the browser; the "local copy" is the same URI. */
export const keepLocalCopy = async ({ files }: { files: { uri: string; fileName?: string }[] }) =>
  files.map(f => ({ status: 'success' as const, localUri: f.uri, sourceUri: f.uri }));

export const viewDocument = async ({ uri }: { uri: string }) => {
  window.open(uri.split('#')[0], '_blank', 'noopener');
};

export const pickDirectory = async () => {
  throw new PickerCancelledError('Picking folders is not supported in the browser', errorCodes.UNABLE_TO_OPEN_FILE_TYPE);
};

export const saveDocuments = async () => {
  throw new PickerCancelledError('Saving files is not supported in the browser', errorCodes.UNABLE_TO_OPEN_FILE_TYPE);
};

export const isKnownType = () => ({ isKnown: true, UTType: null, preferredFilenameExtension: null, mimeType: null });

export default { pick, types, errorCodes, isErrorWithCode, keepLocalCopy, viewDocument, pickDirectory, saveDocuments };
