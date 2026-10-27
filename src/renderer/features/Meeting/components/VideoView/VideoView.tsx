import { Avatar } from '@/renderer/shared/components';
import AgoraEngineService from '@/shared/services/Agora/AgoraEngineService';
import Icon from 'assets/svg/icons';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { VideoViewProps } from './types';
import {
  RenderModeType,
  VideoMirrorModeType,
  VideoSourceType,
  VideoViewSetupMode,
} from 'agora-electron-sdk';
import './VideoView.scss';

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
  reaction,
  isSharing = false,
  hideLabel = false,
}: VideoViewProps) {
  const isSetup = useRef(false);
  const localSource = isSharing
    ? VideoSourceType.VideoSourceScreen
    : VideoSourceType.VideoSourceCamera;

  useLayoutEffect(() => {
    if (debug || !enableVideo) {
      return;
    }

    const view = document.getElementById(`surface-view-${uid}`);
    if (!view || isSetup.current) {
      return;
    }

    if (isLocal) {
      AgoraEngineService.setupLocalVideo({
        sourceType: localSource,
        renderMode: RenderModeType.RenderModeFit,
        view,
        // mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
        setupMode: VideoViewSetupMode.VideoViewSetupReplace,
      });
    } else {
      AgoraEngineService.setupRemoteVideo({
        uid,
        sourceType: VideoSourceType.VideoSourceRemote,
        view,
        renderMode: RenderModeType.RenderModeFit,
        setupMode: VideoViewSetupMode.VideoViewSetupReplace,
      });
    }

    isSetup.current = true;

    return () => {
      if (isLocal) {
        AgoraEngineService.setupLocalVideo({
          sourceType: localSource,
          renderMode: RenderModeType.RenderModeFit,
          view: null,
          mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
          setupMode: VideoViewSetupMode.VideoViewSetupReplace,
        });
      } else {
        AgoraEngineService.setupRemoteVideo({
          uid,
          sourceType: VideoSourceType.VideoSourceRemote,
          view: null,
          renderMode: RenderModeType.RenderModeFit,
          setupMode: VideoViewSetupMode.VideoViewSetupReplace,
        });
      }
      isSetup.current = false;
    };
  }, [isLocal, uid, debug, enableVideo, localSource]);

  const renderReaction = useMemo(() => {
    if (reaction) {
      let name = ''
      switch(reaction.toLocaleLowerCase()) {
        case 'hand':
          name = 'hand';
          break;
        case 'clap':
          name = 'clap';
          break;
        case 'heart':
          name = 'heart';
          break;
        case 'like':
          name = 'like';
          break;
        default:
          break;
      }
      if(name) {
        return <Icon name={name} className="surface-view-info-reaction" style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32px',
          height: '32px',
        }} />;
      }
    }
  }, [reaction]);

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
      {!hideLabel && (
        <div className="surface-view-info">
          <Icon name={enableAudio ? 'tileMic' : 'tileMicOff'} />
          <span className="surface-view-info-label">{label}</span>
        </div>
      )}
      {renderReaction}
    </div>
  );
}
