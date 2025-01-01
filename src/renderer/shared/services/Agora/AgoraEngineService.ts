const AgoraRTC = window.require('agora-electron-sdk');

class AgoraEngineService {
  // eslint-disable-next-line no-use-before-define
  private static instance: AgoraEngineService;

  private engine: any;

  private constructor() {
    this.engine = AgoraRTC.createAgoraRtcEngine();
    this.engine.initialize({ appId: 'c2c92894c294415d9af39e31bcec8832' });
  }

  public static getInstance(): AgoraEngineService {
    if (!AgoraEngineService.instance) {
      AgoraEngineService.instance = new AgoraEngineService();
    }
    return AgoraEngineService.instance;
  }

  public getEngine(): any {
    return this.engine;
  }
}

export default AgoraEngineService.getInstance().getEngine();
