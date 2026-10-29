import { Avatar } from '@/renderer/shared/components';
import AgoraEngineService from '@/shared/services/Agora/AgoraEngineService';
import Icon from 'assets/svg/icons';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  RenderModeType,
  VideoMirrorModeType,
  VideoSourceType,
  VideoViewSetupMode,
} from 'agora-electron-sdk';
import { VideoViewProps } from './types';
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
  hideMic = false,
  connecting = false,
}: VideoViewProps) {
  const isSetup = useRef(false);
  const localSource = isSharing
    ? VideoSourceType.VideoSourceScreen
    : VideoSourceType.VideoSourceCamera;
  // Present via RTM/server but no RTC media: always show the avatar, never
  // the (nonexistent) video surface.
  const showVideo = enableVideo && !connecting;

  useLayoutEffect(() => {
    if (debug || !showVideo) {
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
  }, [isLocal, uid, debug, showVideo, localSource]);

  // Heart/Like/Clap float up on their own (see ReactionBubbles); the tile
  // badge only ever shows a raised hand.
  const renderReaction = useMemo(() => {
    if (reaction?.toLocaleLowerCase() === 'hand') {
      return (
        <Icon
          name="hand"
          className="surface-view-info-reaction"
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '32px',
          }}
        />
      );
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
      {showVideo ? (
        <div className="surface-view-item" id={`surface-view-${uid}`} />
      ) : (
        <Avatar url={avatar} radius={32} name={label} />
      )}
      {connecting && (
        <div className="surface-view-connecting">Đang kết nối…</div>
      )}
      {!hideLabel && (
        <div className="surface-view-info">
          {!connecting && !hideMic && (
            <Icon name={enableAudio ? 'tileMic' : 'tileMicOff'} />
          )}
          <span className="surface-view-info-label">{label}</span>
        </div>
      )}
      {renderReaction}
    </div>
  );
}
