import AgoraEngineService from '@/renderer/shared/services/Agora';
import {
  BackgroundBlurDegree,
  BackgroundSourceType,
  MediaSourceType,
} from 'agora-electron-sdk';

const fs = window.require('fs');
const path = window.require('path');

/**
 * The chosen virtual background, kept on this device. It used to live only
 * in the running Agora engine, so it was lost whenever the app restarted or
 * the user was logged out (e.g. by signing in on another device). Logout
 * keeps it: it is a device preference, like the lobby's mic/camera choice.
 */
const KEY = 'meeting.virtualBackground';

/** One of the bundled backgrounds, at the path of the running install. */
const PRESET = /virtual_background_\d+\.jpg$/;
const relocatePreset = (src: string): string | undefined => {
  const name = path.basename(src);
  if (!PRESET.test(name) || !process.resourcesPath) return undefined;
  const moved = path.join(
    process.resourcesPath,
    'assets/images/virtual_background',
    name,
  );
  return fs.existsSync(moved) ? moved : undefined;
};

/** Image path of the saved background, or undefined for none. */
export const loadVirtualBackground = (): string | undefined => {
  try {
    const src = localStorage.getItem(KEY) || undefined;
    if (!src || fs.existsSync(src)) return src;
    // A bundled one saved by another install (reinstalled, or run from a
    // different place — a DMG mounts somewhere new each time): same image.
    const moved = relocatePreset(src);
    if (moved) localStorage.setItem(KEY, moved);
    // Otherwise a photo of mine that has since been deleted.
    return moved;
  } catch (_) {
    return undefined;
  }
};

/** Turns the background on (image path) or off (undefined) for the camera. */
export const applyVirtualBackground = (src: string | undefined) => {
  if (!src) {
    AgoraEngineService.enableVirtualBackground(
      false,
      {},
      {},
      MediaSourceType.PrimaryCameraSource,
    );
    return;
  }
  AgoraEngineService.enableVirtualBackground(
    true,
    {
      background_source_type: BackgroundSourceType.BackgroundImg,
      source: src,
      blur_degree: BackgroundBlurDegree.BlurDegreeLow,
    },
    { greenCapacity: 0.2 },
    MediaSourceType.PrimaryCameraSource,
  );
};

/** Saves the choice and applies it right away. */
export const saveVirtualBackground = (src: string | undefined) => {
  try {
    if (src) localStorage.setItem(KEY, src);
    else localStorage.removeItem(KEY);
  } catch (_) {
    // Applied for this session only.
  }
  applyVirtualBackground(src);
};

/** Re-applies the saved choice (call when the camera starts). */
export const restoreVirtualBackground = () => {
  const src = loadVirtualBackground();
  if (src) applyVirtualBackground(src);
};
