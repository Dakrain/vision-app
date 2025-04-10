// const AgoraRTC = window.require('agora-electron-sdk');
import { createAgoraRtcEngine, IRtcEngineEx } from 'agora-electron-sdk';

class AgoraEngineService {
  // eslint-disable-next-line no-use-before-define
  private static instance: AgoraEngineService;

  private engine: IRtcEngineEx;
  private shareScreenEngine: IRtcEngineEx;

  private constructor() {
    this.engine = createAgoraRtcEngine();
    this.shareScreenEngine = createAgoraRtcEngine();
    this.engine.initialize({ appId: 'c2c92894c294415d9af39e31bcec8832' });
    this.shareScreenEngine.initialize({ appId: 'c2c92894c294415d9af39e31bcec8832' });
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

  public getShareScreenEngine(): IRtcEngineEx {
    return this.shareScreenEngine;
  }
}

export default AgoraEngineService.getInstance().getEngine();
