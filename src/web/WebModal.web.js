/**
 * Web-only `Modal` (wired up in src/web/reactNative.web.js).
 *
 * Every modal in the app is written for phones: bottom sheets span the full
 * width and centred dialogs are sized in percent. In a desktop browser that
 * meant sheets ran edge to edge across the monitor and dialogs stretched to
 * ~90% of the window. Fixing all ~50 modals one by one would be brittle, so
 * this wraps react-native-web's Modal (which react-native-modal also uses)
 * and, on wide windows, caps the width of the modal's panel and centres it:
 *
 *   - a panel touching the bottom of the window (a sheet) -> SHEET_MAX_WIDTH
 *   - any other floating panel (a dialog)                 -> DIALOG_MAX_WIDTH
 *
 * The panel is found by walking down from the modal root, past backdrops
 * (full-window, semi-transparent) and layout wrappers (transparent), to the
 * first element with its own background. Full-window opaque content is
 * treated as a full-screen page and left alone, as are non-transparent
 * modals. Phones and narrow windows are never touched.
 *
 * Opt out per modal with `webFullWidth`, or set your own cap with
 * `webMaxWidth={number}`.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal as RNWModal } from 'react-native-web';

export const SHEET_MAX_WIDTH = 640;
export const DIALOG_MAX_WIDTH = 560;
/** Below this window width modals keep their phone layout. */
const MIN_WINDOW_WIDTH = 700;
const MAX_DEPTH = 8;
const APPLIED = 'icwConstrained';

const alphaOf = color => {
  if (!color || color === 'transparent') return 0;
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return 1;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 4) return 1;
  const a = parts[3];
  return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
};

const restore = el => {
  if (!el.dataset[APPLIED]) return;
  const original = JSON.parse(el.dataset[APPLIED]);
  Object.keys(original).forEach(key => {
    el.style[key] = original[key];
  });
  delete el.dataset[APPLIED];
};

const constrain = (el, cap) => {
  if (!el.dataset[APPLIED]) {
    const parentWidth = el.parentElement?.clientWidth ?? window.innerWidth;
    const fillsParent = el.offsetWidth >= parentWidth - 1;
    el.dataset[APPLIED] = JSON.stringify({
      maxWidth: el.style.maxWidth,
      width: el.style.width,
      marginLeft: el.style.marginLeft,
      marginRight: el.style.marginRight,
      alignSelf: el.style.alignSelf,
    });
    // A stretched panel keeps full width up to the cap; a %-width one keeps
    // its own width (capped). Auto margins centre it either way, including
    // absolutely positioned sheets (left: 0; right: 0).
    if (fillsParent) el.style.width = '100%';
    el.style.marginLeft = 'auto';
    el.style.marginRight = 'auto';
    el.style.alignSelf = 'center';
  }
  el.style.maxWidth = `${cap}px`;
};

const constrainPanels = (root, maxWidthOverride) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < MIN_WINDOW_WIDTH;

  const visit = (el, depth) => {
    if (!(el instanceof HTMLElement) || depth > MAX_DEPTH) return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    if (el.dataset[APPLIED] && narrow) {
      restore(el);
      return;
    }

    const alpha = alphaOf(style.backgroundColor);
    const fullHeight = el.offsetHeight >= vh - 2;
    const rect = el.getBoundingClientRect();

    if (fullHeight) {
      // Opaque full-window content is a full-screen page: leave it.
      if (alpha >= 1 && style.opacity !== '0') return;
      // Backdrop or full-window wrapper: the panel is further down.
      Array.from(el.children).forEach(child => visit(child, depth + 1));
      return;
    }

    if (alpha === 0 && !el.dataset[APPLIED]) {
      // Transparent layout wrapper (KeyboardAvoidingView, gesture views...).
      Array.from(el.children).forEach(child => visit(child, depth + 1));
      return;
    }

    // `el` is the panel. Bars pinned to the top belong to full-screen
    // layouts, not floating panels.
    if (narrow || rect.top <= 1) return;
    const isSheet = rect.bottom >= vh - 2;
    const cap = maxWidthOverride ?? (isSheet ? SHEET_MAX_WIDTH : DIALOG_MAX_WIDTH);
    if (el.dataset[APPLIED] || el.offsetWidth > cap) constrain(el, cap);
  };

  Array.from(root.children).forEach(child => visit(child, 0));
};

const WebModal = ({ webFullWidth, webMaxWidth, ...props }) => {
  // State, not a ref: the portal can mount its children after this
  // component's first effect, and the observer must attach once it does.
  const [root, setRoot] = useState(null);
  const frame = useRef(0);
  // Non-transparent RN modals are full-screen pages by definition.
  const enabled = !webFullWidth && !!props.transparent && !!props.visible;

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (root?.isConnected) constrainPanels(root, webMaxWidth);
    });
  }, [root, webMaxWidth]);

  useEffect(() => {
    if (!enabled || !root) return undefined;
    // Re-check while the open animation settles (it shifts the panel).
    const timers = [0, 120, 350].map(ms => setTimeout(schedule, ms));
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame.current);
    };
  }, [enabled, root, schedule]);

  return React.createElement(
    RNWModal,
    props,
    // `display: contents` adds no box, so the modal's layout is unchanged.
    React.createElement('div', { ref: setRoot, style: { display: 'contents' } }, props.children),
  );
};

WebModal.displayName = 'Modal';

export default WebModal;
