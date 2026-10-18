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

export default AgoraEngineService.getInstance().getEngine();
