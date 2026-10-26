import AgoraEngineService from '@/renderer/shared/services/Agora';
import {
  BackgroundBlurDegree,
  BackgroundSourceType,
  MediaSourceType,
} from 'agora-electron-sdk';

const fs = window.require('fs');

/**
 * The chosen virtual background, kept on this device. It used to live only
 * in the running Agora engine, so it was lost whenever the app restarted or
 * the user was logged out (e.g. by signing in on another device). Logout
 * keeps it: it is a device preference, like the lobby's mic/camera choice.
 */
const KEY = 'meeting.virtualBackground';

/** Image path of the saved background, or undefined for none. */
export const loadVirtualBackground = (): string | undefined => {
  try {
    const src = localStorage.getItem(KEY) || undefined;
    // A custom image the user has since deleted.
    return src && fs.existsSync(src) ? src : undefined;
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
