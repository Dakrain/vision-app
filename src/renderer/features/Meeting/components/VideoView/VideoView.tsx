import AgoraEngineService from '@/shared/services/Agora/AgoraEngineService';
import { useLayoutEffect } from 'react';
import { Avatar } from '@/renderer/shared/components';
import Icon from 'assets/svg/icons';
import { VideoViewProps } from './types';
import './VideoView.scss';

const { VideoMirrorModeType } = window.require('agora-electron-sdk');

const { RenderModeType, VideoSourceType, VideoViewSetupMode } =
  window.require('agora-electron-sdk');

export function VideoView({
  className,
  uid,
  isLocal,
  enableVideo = false,
  enableAudio,
  avatar,
  label,
  debug = true,
  style,
}: VideoViewProps) {
  useLayoutEffect(() => {
    if (debug) {
      // Do nothing
    } else if (isLocal) {
      AgoraEngineService.setupLocalVideo({
        sourceType: VideoSourceType.VideoSourceCameraPrimary,
        renderMode: RenderModeType.RenderModeFit,
        view: document.getElementById(`surface-view-${uid}`),
        mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
        setupMode: VideoViewSetupMode.VideoViewSetupReplace,
      });
    } else {
      AgoraEngineService.setupRemoteVideo({
        uid,
        sourceType: VideoSourceType.VideoSourceRemote,
        view: document.getElementById(`surface-view-${uid}`),
        renderMode: RenderModeType.RenderModeFit,
        setupMode: VideoViewSetupMode.VideoViewSetupReplace,
      });
    }
  }, [isLocal, uid, debug, enableVideo]);

  return (
    <div
      className={`surface-view ${className}`}
      style={{
        ...style,
        position: 'relative',
      }}
    >
      {enableVideo ? (
        <div className="surface-view-item" id={`surface-view-${uid}`} />
      ) : (
        <Avatar url={avatar} radius={32} name={label} />
      )}
      <div className="surface-view-info">
        <Icon name={enableAudio ? 'micOn' : 'micOff'} />
        <span className="surface-view-info-label">{label}</span>
      </div>
    </div>
  );
}
