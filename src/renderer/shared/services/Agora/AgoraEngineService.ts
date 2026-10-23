import { createAgoraRtcEngine, IRtcEngineEx } from 'agora-electron-sdk';
import { AGORA_APP_ID } from '../../config';

class AgoraEngineService {
  // eslint-disable-next-line no-use-before-define
  private static instance: AgoraEngineService;

  private engine: IRtcEngineEx;

  private constructor() {
    this.engine = createAgoraRtcEngine();
    this.engine.initialize({ appId: AGORA_APP_ID });
    this.engine.enableExtension(
      'agora_video_filters_segmentation',
      'portrait_segmentation',
      true,
    );
  }

  public static getInstance(): AgoraEngineService {
    if (!AgoraEngineService.instance) {
      AgoraEngineService.instance = new AgoraEngineService();
    }
    return AgoraEngineService.instance;
  }

  public getEngine(): IRtcEngineEx {
    return this.engine;
  }
}

/**
 * The engine, created on first use. Initializing it (and loading the
 * segmentation extension) blocks the renderer, so doing it at import time
 * delayed the first paint of every launch even when no call or meeting
 * was started.
 */
const lazyEngine = new Proxy({} as IRtcEngineEx, {
  get(_, prop) {
    // Dev-time React Refresh inspects every export (`$$typeof`, symbols);
    // that must not start the engine.
    if (typeof prop === 'symbol' || prop === '$$typeof') return undefined;
    const engine = AgoraEngineService.getInstance().getEngine();
    const value = Reflect.get(engine, prop);
    return typeof value === 'function' ? value.bind(engine) : value;
  },
});

export default lazyEngine;
