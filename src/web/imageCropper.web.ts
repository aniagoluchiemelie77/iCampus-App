/// <reference lib="dom" />
/**
 * Interactive image cropper for the web picker (imageCropPicker.web.ts).
 *
 * react-native-image-crop-picker's cropper is native code (UCrop on
 * Android, TOCropViewController on iOS), so the browser needs its own. This
 * one mirrors them: a fixed-ratio frame over the photo, drag to move, scroll /
 * pinch / slider to zoom, rotate 90°, reset. Keyboard: arrows move, + / -
 * zoom, R rotates, Enter confirms, Esc cancels.
 *
 * It is plain DOM (not React) because the picker API is called imperatively,
 * outside any component tree.
 */

export interface CropOptions {
  /** Output size; also sets the frame's aspect ratio. */
  width?: number;
  height?: number;
  circle?: boolean;
  title?: string;
  chooseText?: string;
  cancelText?: string;
  /** Called on cancel; the promise rejects with this error. */
  cancelError: () => Error;
}

type Source = HTMLCanvasElement;

const PRIMARY = '#f54b02';
const MAX_ZOOM = 5;
const ZIndex = 2147483000;

const ICONS = {
  // Material "rotate_right" (the button turns the photo clockwise).
  rotate:
    '<path d="M15.55 5.55 11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42 1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>',
  reset:
    '<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>',
  minus: '<path d="M19 13H5v-2h14v2z"/>',
  plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
  close:
    '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
};
const svg = (path: string, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${path}</svg>`;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  css: string,
  attrs: Record<string, string> = {},
  html = '',
) => {
  const node = document.createElement(tag);
  node.style.cssText = css;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
};

/** Longest side of the working copy. Phones refuse canvases over ~16.7MP. */
const MAX_SOURCE_SIDE = 4096;

const toCanvas = (image: CanvasImageSource & { width: number; height: number }): Source => {
  const fit = Math.min(1, MAX_SOURCE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * fit));
  canvas.height = Math.max(1, Math.round(image.height * fit));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const rotate90 = (source: Source): Source => {
  const canvas = document.createElement('canvas');
  canvas.width = source.height;
  canvas.height = source.width;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return canvas;
};

/**
 * Shows the cropper and resolves with the cropped image as a canvas, sized
 * `width` x `height` when given (like the native picker), otherwise at the
 * cropped area's own resolution.
 */
export const cropImageInteractively = (
  image: CanvasImageSource & { width: number; height: number },
  options: CropOptions,
): Promise<HTMLCanvasElement> =>
  new Promise((resolve, reject) => {
    const aspect =
      options.width && options.height ? options.width / options.height : 1;
    let source = toCanvas(image);

    // View state, independent of window size: the image point under the
    // frame's centre (in source pixels) and zoom relative to "just covers".
    let centerX = source.width / 2;
    let centerY = source.height / 2;
    let zoom = 1;

    // Layout, recomputed on resize.
    let frame = { x: 0, y: 0, w: 0, h: 0 };
    let minScale = 1;
    const scale = () => minScale * zoom;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // ---- DOM ------------------------------------------------------------
    const root = el(
      'div',
      `position:fixed;inset:0;z-index:${ZIndex};display:flex;flex-direction:column;
       background:#0d0d0d;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
       user-select:none;-webkit-user-select:none;`,
      { role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title || 'Crop photo' },
    );

    const bar = el(
      'div',
      'display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);',
    );
    const cancelBtn = el(
      'button',
      `display:flex;align-items:center;gap:6px;background:none;border:0;color:#fff;font-size:15px;
       font-weight:600;cursor:pointer;padding:8px 10px;border-radius:10px;`,
      { type: 'button', 'aria-label': options.cancelText || 'Cancel' },
      `${svg(ICONS.close, 20)}<span>${options.cancelText || 'Cancel'}</span>`,
    );
    const title = el(
      'div',
      'flex:1;text-align:center;font-size:16px;font-weight:700;',
      {},
      options.title || 'Crop photo',
    );
    const chooseBtn = el(
      'button',
      `background:${PRIMARY};border:0;color:#fff;font-size:15px;font-weight:700;cursor:pointer;
       padding:10px 18px;border-radius:12px;`,
      { type: 'button' },
      options.chooseText || 'Choose',
    );
    bar.append(cancelBtn, title, chooseBtn);

    const stage = el(
      'div',
      'position:relative;flex:1;overflow:hidden;touch-action:none;cursor:grab;outline:none;',
      { tabindex: '0', 'aria-label': 'Drag to move the photo, scroll to zoom' },
    );
    const canvasView = source; // the source canvas is the on-screen image
    const placeImageNode = (node: HTMLCanvasElement) => {
      node.style.cssText =
        'position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none;';
    };
    placeImageNode(canvasView);
    let imageNode: HTMLCanvasElement = canvasView;

    const frameNode = el(
      'div',
      `position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.62);border:2px solid rgba(255,255,255,.95);
       pointer-events:none;box-sizing:border-box;${options.circle ? 'border-radius:50%;' : 'border-radius:4px;'}`,
    );
    // Rule-of-thirds grid, shown while adjusting.
    const grid = el(
      'div',
      `position:absolute;inset:0;opacity:0;transition:opacity .15s;
       background:
         linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% + .5px), transparent calc(66.66% + .5px)),
         linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% + .5px), transparent calc(66.66% + .5px));
       ${options.circle ? 'border-radius:50%;' : ''}`,
    );
    frameNode.appendChild(grid);
    stage.append(imageNode, frameNode);

    const controls = el(
      'div',
      `display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 16px 20px;
       border-top:1px solid rgba(255,255,255,.08);`,
    );
    const iconBtn = (path: string, label: string) =>
      el(
        'button',
        `display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:21px;
         background:rgba(255,255,255,.1);border:0;color:#fff;cursor:pointer;flex-shrink:0;`,
        { type: 'button', 'aria-label': label, title: label },
        svg(path),
      );
    const zoomOutBtn = iconBtn(ICONS.minus, 'Zoom out');
    const slider = el(
      'input',
      `flex:1;max-width:320px;accent-color:${PRIMARY};cursor:pointer;`,
      { type: 'range', min: '1', max: String(MAX_ZOOM), step: '0.01', value: '1', 'aria-label': 'Zoom' },
    ) as HTMLInputElement;
    const zoomInBtn = iconBtn(ICONS.plus, 'Zoom in');
    const rotateBtn = iconBtn(ICONS.rotate, 'Rotate 90°');
    const resetBtn = iconBtn(ICONS.reset, 'Reset');
    controls.append(zoomOutBtn, slider, zoomInBtn, rotateBtn, resetBtn);

    root.append(bar, stage, controls);
    document.body.appendChild(root);

    // ---- Geometry -------------------------------------------------------
    const clamp = () => {
      zoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
      const s = scale();
      // Keep the frame covered: the centre can't get closer to an edge
      // than half the frame (in source pixels).
      const halfW = frame.w / 2 / s;
      const halfH = frame.h / 2 / s;
      centerX = Math.min(source.width - halfW, Math.max(halfW, centerX));
      centerY = Math.min(source.height - halfH, Math.max(halfH, centerY));
    };

    const render = () => {
      clamp();
      const s = scale();
      const x = frame.x + frame.w / 2 - centerX * s;
      const y = frame.y + frame.h / 2 - centerY * s;
      imageNode.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      slider.value = String(zoom);
    };

    const layout = () => {
      const pad = window.innerWidth < 600 ? 20 : 40;
      const availW = stage.clientWidth - pad * 2;
      const availH = stage.clientHeight - pad * 2;
      let w = Math.min(availW, 640);
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }
      frame = {
        x: (stage.clientWidth - w) / 2,
        y: (stage.clientHeight - h) / 2,
        w,
        h,
      };
      frameNode.style.left = `${frame.x}px`;
      frameNode.style.top = `${frame.y}px`;
      frameNode.style.width = `${w}px`;
      frameNode.style.height = `${h}px`;
      minScale = Math.max(w / source.width, h / source.height);
      render();
    };

    /** Zoom to `next`, keeping the stage point (px, py) still. */
    const zoomAt = (next: number, px = frame.x + frame.w / 2, py = frame.y + frame.h / 2) => {
      const before = scale();
      const target = Math.min(MAX_ZOOM, Math.max(1, next));
      const after = minScale * target;
      // Image point under (px, py) stays under it.
      const imgX = centerX + (px - (frame.x + frame.w / 2)) / before;
      const imgY = centerY + (py - (frame.y + frame.h / 2)) / before;
      zoom = target;
      centerX = imgX - (px - (frame.x + frame.w / 2)) / after;
      centerY = imgY - (py - (frame.y + frame.h / 2)) / after;
      render();
    };

    const pan = (dx: number, dy: number) => {
      const s = scale();
      centerX -= dx / s;
      centerY -= dy / s;
      render();
    };

    const showGrid = (on: boolean) => {
      grid.style.opacity = on ? '1' : '0';
    };

    // ---- Pointer: drag + pinch -------------------------------------------
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { dist: number; zoom: number } | null = null;
    const stagePoint = (e: PointerEvent | WheelEvent) => {
      const rect = stage.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const distance = () => {
      const [a, b] = Array.from(pointers.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (e: PointerEvent) => {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, stagePoint(e));
      stage.style.cursor = 'grabbing';
      showGrid(true);
      if (pointers.size === 2) pinchStart = { dist: distance(), zoom };
    };
    const onPointerMove = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      const point = stagePoint(e);
      pointers.set(e.pointerId, point);
      if (pointers.size === 2 && pinchStart) {
        const [a, b] = Array.from(pointers.values());
        zoomAt(pinchStart.zoom * (distance() / pinchStart.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (pointers.size === 1) {
        pan(point.x - previous.x, point.y - previous.y);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) {
        stage.style.cursor = 'grab';
        showGrid(false);
      }
    };
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = stagePoint(e);
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      zoomAt(zoom * factor, p.x, p.y);
      showGrid(true);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => showGrid(false), 300);
    };

    // ---- Actions ----------------------------------------------------------
    const doRotate = () => {
      const relX = centerX / source.width;
      const relY = centerY / source.height;
      source = rotate90(source);
      placeImageNode(source);
      stage.replaceChild(source, imageNode);
      imageNode = source;
      // Rotating 90° clockwise maps (x, y) -> (1 - y, x) in relative terms.
      centerX = (1 - relY) * source.width;
      centerY = relX * source.height;
      layout();
    };
    const doReset = () => {
      centerX = source.width / 2;
      centerY = source.height / 2;
      zoom = 1;
      render();
    };

    // The cropper can open over a react-native-web Modal (the photo confirm
    // step). That modal traps focus and closes on Escape keyup, both via
    // document listeners; window capture listeners run first and keep
    // those events away from it while the cropper is up.
    const guardFocus = (e: FocusEvent) => {
      if (e.target instanceof Node && root.contains(e.target)) e.stopPropagation();
    };
    const swallowKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') e.stopPropagation();
    };

    const cleanup = () => {
      window.removeEventListener('resize', layout);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('focus', guardFocus, true);
      // The keyup of the Escape/Enter that closed us is still to come.
      setTimeout(() => window.removeEventListener('keyup', swallowKeyUp, true), 500);
      document.body.style.overflow = previousOverflow;
      root.remove();
      previousFocus?.focus?.();
    };

    const confirm = () => {
      const s = scale();
      const sw = frame.w / s;
      const sh = frame.h / s;
      const sx = centerX - sw / 2;
      const sy = centerY - sh / 2;
      const outW = Math.max(1, Math.round(options.width || sw));
      const outH = Math.max(1, Math.round(options.height || sh));
      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);
      cleanup();
      resolve(out);
    };
    const cancel = () => {
      cleanup();
      reject(options.cancelError());
    };

    function onKey(e: KeyboardEvent) {
      const step = e.shiftKey ? 40 : 10;
      switch (e.key) {
        case 'Escape':
          cancel();
          break;
        case 'Enter':
          // Let Enter on a focused button do that button's job.
          if (document.activeElement?.tagName === 'BUTTON') return;
          confirm();
          break;
        case 'ArrowLeft':
          pan(step, 0);
          break;
        case 'ArrowRight':
          pan(-step, 0);
          break;
        case 'ArrowUp':
          pan(0, step);
          break;
        case 'ArrowDown':
          pan(0, -step);
          break;
        case '+':
        case '=':
          zoomAt(zoom * 1.15);
          break;
        case '-':
        case '_':
          zoomAt(zoom / 1.15);
          break;
        case 'r':
        case 'R':
          doRotate();
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', e => {
      const rect = stage.getBoundingClientRect();
      zoomAt(zoom < 2 ? 2 : 1, e.clientX - rect.left, e.clientY - rect.top);
    });
    slider.addEventListener('input', () => zoomAt(Number(slider.value)));
    zoomInBtn.addEventListener('click', () => zoomAt(zoom * 1.25));
    zoomOutBtn.addEventListener('click', () => zoomAt(zoom / 1.25));
    rotateBtn.addEventListener('click', doRotate);
    resetBtn.addEventListener('click', doReset);
    cancelBtn.addEventListener('click', cancel);
    chooseBtn.addEventListener('click', confirm);
    window.addEventListener('resize', layout);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', swallowKeyUp, true);
    window.addEventListener('focus', guardFocus, true);

    layout();
    stage.focus();
  });
