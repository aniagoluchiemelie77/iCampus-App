/// <reference lib="dom" />
/**
 * Browser file chooser shared by the web picker stand-ins
 * (imageCropPicker.web.ts, documentPicker.web.ts).
 */

export class PickerCancelledError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

interface PickOptions {
  accept?: string;
  multiple?: boolean;
  /** 'environment' / 'user' opens the camera on phones (ignored on desktop). */
  capture?: 'environment' | 'user';
  cancelError: () => Error;
}

/**
 * Opens the file dialog and resolves with the chosen files, or rejects with
 * `cancelError()` when the dialog is dismissed.
 */
export const chooseFiles = ({
  accept,
  multiple,
  capture,
  cancelError,
}: PickOptions): Promise<File[]> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;
    if (capture) input.setAttribute('capture', capture);
    // Safari only opens inputs that are in the document.
    input.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0;';
    document.body.appendChild(input);

    let settled = false;
    const finish = (files: File[] | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
      if (files && files.length) resolve(files);
      else reject(cancelError());
    };

    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    // Chrome 113+, Firefox 91+, Safari 16.4+.
    input.addEventListener('cancel', () => finish(null));
    // Older browsers: the page regains focus when the dialog closes. The
    // delay lets a pending `change` event arrive first.
    const onWindowFocus = () =>
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 1000);
    window.addEventListener('focus', onWindowFocus);

    input.click();
  });

/**
 * Object URL for a picked file. The file name is added as a #fragment so
 * code that reads the extension from the URI (uploads, previews) still finds
 * it; browsers ignore the fragment when loading blob: URLs.
 */
export const fileToUri = (blob: Blob, name: string) =>
  `${URL.createObjectURL(blob)}#${encodeURIComponent(name)}`;

export const revokeUri = (uri: string) => {
  if (uri?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri.split('#')[0]);
    } catch {}
  }
};
