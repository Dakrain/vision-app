/* eslint-disable @typescript-eslint/no-unused-vars */
import { useAppDispatch, useAppSelector } from '@/renderer/store/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  addChat,
  remoteUserMutedAudio,
  remoteUserMutedVideo,
  removeMeetingUser,
  resetMeetingState,
  setReaction,
  userReaction
} from '@/renderer/features/Meeting/store/slice';

import {
  debouncedFetchMeetingUsers,
  debouncedUpdateUserConfig,
  fetchAllMeetingData,
  startShareScreen,
  stopShareScreen
} from '@/renderer/features/Meeting/store/action';
import {
  selectMeetingDetail,
  selectMeetingUsers,
} from '@/renderer/features/Meeting/store/selector';
import useLoading from '@/renderer/shared/hooks/useLoading';
import MeetingService from '@/shared/services/Meeting/MeetingService';
import {
  createClient,
  RtmChannel,
  RtmMessage,
  RtmTextMessage,
} from 'agora-rtm-react';
import useMessage from 'antd/es/message/useMessage';
import { camelizeKeys, decamelizeKeys } from 'humps';
import AgoraEngineService from '../services/Agora/AgoraEngineService';
import { AgoraRtmMessage, MeetingChat } from '../types/meeting';

const {
  IRtcEngineEventHandler,
  ScreenCaptureSourceInfo,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
} = window.require('agora-electron-sdk');
// import { ChannelProfileType, ClientRoleType, ConnectionStateType, IRtcEngineEventHandler, ScreenCaptureSourceInfo } from 'agora-electron-sdk';

const useClient = createClient('c2c92894c294415d9af39e31bcec8832');

export const useMeeting = () => {
  const location = useLocation();
  const { meetingId } = location.state || {};
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const meetingDetail = useAppSelector(selectMeetingDetail);
  const meetingUsers = useAppSelector(selectMeetingUsers);
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableMic, setEnableMic] = useState(true);
  const [shareScreen, setShareScreen] = useState(false);
  const [sources, setSources] = useState<(typeof ScreenCaptureSourceInfo)[]>(
    [],
  );
  const [isSharing, setIsSharing] = useState(false);
  const { withLoading } = useLoading();
  const client = useClient();
  const channel = useRef<RtmChannel | null>(null);

  const toggleMic = () => {
    setEnableMic(!enableMic);
    if (enableMic) {
      AgoraEngineService.muteLocalAudioStream(true);
    } else {
      AgoraEngineService.muteLocalAudioStream(false);
    }
    dispatch(
      debouncedUpdateUserConfig({
        meetingId: Number(meetingId),
        request: {
          enable_audio: enableMic ? 0 : 1,
        },
      }),
    );
  };
  const toggleCamera = () => {
    setEnableCamera(!enableCamera);
    if (enableCamera) {
      AgoraEngineService.muteLocalVideoStream(true);
    } else {
      AgoraEngineService.muteLocalVideoStream(false);
    }
    dispatch(
      debouncedUpdateUserConfig({
        meetingId: Number(meetingId),
        request: {
          enable_video: enableCamera ? 0 : 1,
        },
      }),
    );
  };

  const updateMediaState = useCallback(({
    enableMic: newEnableMic,
    enableCamera: newEnableCamera,
    shareScreen: newShareScreen
  }: {
    enableMic?: boolean;
    enableCamera?: boolean;
    shareScreen?: boolean;
  }) => {
    if (newEnableMic !== undefined) {
      setEnableMic(newEnableMic);
      AgoraEngineService.muteLocalAudioStream(!newEnableMic);
    }
    
    if (newEnableCamera !== undefined) {
      setEnableCamera(newEnableCamera);
      AgoraEngineService.muteLocalVideoStream(!newEnableCamera);
    }
    
    if (newShareScreen !== undefined) {
      setShareScreen(newShareScreen);
    }
  }, []);

  const startSharingScreen = useCallback(() => {
    updateMediaState({
      enableMic: true,
      enableCamera: true,
      shareScreen: true
    });
    dispatch(startShareScreen(Number(meetingId)));
  }, [dispatch, meetingId, updateMediaState]);

  const stopSharingScreen = useCallback(() => {
    updateMediaState({
      enableMic: false,
      enableCamera: false,
      shareScreen: false
    });
    dispatch(stopShareScreen(Number(meetingId)));
  }, [dispatch, meetingId, updateMediaState]);

  const sendMessage = (message: MeetingChat) => {
    // Only send the message through the channel
    const rtmMessage: AgoraRtmMessage = {
      message_type: 'NEW_CHAT',
      message_sub_type: null,
      message_content: decamelizeKeys(message),
    };

    const rtm = client.createMessage({
      text: JSON.stringify(rtmMessage),
      messageType: 'TEXT',
    });

    channel.current?.sendMessage(rtm);
  };

  const sendReaction = (reaction: string) => {
    const rtmMessage: AgoraRtmMessage = {
      message_type: 'ACTION',
      message_sub_type: 'ROOM_REACTION',
      message_content: reaction,
    };

    const rtm = client.createMessage({
      text: JSON.stringify(rtmMessage),
      messageType: 'TEXT',
    });

    channel.current?.sendMessage(rtm);

    dispatch(userReaction(reaction));
  };

 
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const eventHandler = useMemo<typeof IRtcEngineEventHandler>(
    () => ({
      onJoinChannelSuccess(connection: any) {
        console.log("🚀 ~ onJoinChannelSuccess ~ connection:", connection)
        setIsConnected(true);
      },

      onUserJoined(connection: any, remoteUid: any) {
        console.log("🚀 ~ onUserJoined ~ connection:", connection)
        setRemoteUsers((prevUsers) => {
          // Chỉ thêm remoteUid nếu nó chưa tồn tại trong mảng
          return prevUsers.includes(remoteUid)
            ? prevUsers
            : [...prevUsers, remoteUid];
        });
        dispatch(debouncedFetchMeetingUsers(Number(meetingId)));
      },

      onUserOffline(connection: any, remoteUid: any, reason: any) {
        console.log("🚀 ~ onUserOffline ~ connection:", connection)
        setRemoteUsers((prevUsers) =>
          prevUsers.filter((user) => user !== remoteUid),
        );
        dispatch(removeMeetingUser(remoteUid));
      },

      onUserMuteAudio(connection: any, remoteUid: any, muted: any) {
        console.log("🚀 ~ onUserMuteAudio ~ connection:", connection)
        dispatch(remoteUserMutedAudio({ agUid: remoteUid, muted }));
      },
      onUserMuteVideo(connection: any, remoteUid: any, muted: any) {
        console.log("🚀 ~ onUserMuteVideo ~ connection:", connection)
        dispatch(remoteUserMutedVideo({ agUid: remoteUid, muted }));
      },

      onRemoteAudioStats(connection: any, stats: any) {
      console.log("🚀 ~ useMeeting ~ connection:", connection)
      },
      onConnectionStateChanged(connection: any, state: any, reason: any) {
        console.log("🚀 ~ onConnectionStateChanged ~ connection:", connection)
        if (state === ConnectionStateType.ConnectionStateDisconnected) {
          setIsConnected(false);
        } else if (state === ConnectionStateType.ConnectionStateConnected) {
          setIsConnected(true);
        }
      },

      onError(err: any, msg: any) {
        console.log("🚀 ~ onError ~ err:", err, msg)
        setIsError(true);
      },

      onRemoteVideoStateChanged(
        connection: any,
        remoteUid: any,
        state: any,
        _reason: any,
        _elapsed: any,
      ) {
        console.log("🚀 ~ useMeeting ~ connection:", state)
      },
      onLocalVideoStateChanged(source: any, state: any, reason: any) {
        console.log("🚀 ~ onLocalVideoStateChanged ~ source:", source, state, reason);
      },
      onRemoteAudioStateChanged(
        connection: any,
        remoteUid: any,
        state: any,
        _reason: any,
        _elapsed: any,
      ) {
        console.log("🚀 ~ onRemoteAudioStateChanged ~ connection:", connection);
      },
    }),
    [dispatch, meetingId],
  );
  useEffect(() => {
    // Remove all listeners before joining a new channel
    AgoraEngineService.removeAllListeners();

    // Leave any pending channel
    AgoraEngineService.leaveChannel();

    if (meetingId) {
      withLoading(dispatch(fetchAllMeetingData(Number(meetingId))));
    }

    client.on('MessageFromPeer', (state, reason) => {});

    client.on('ConnectionStateChanged', (state, reason) => {});

    client.on('PeersOnlineStatusChanged', (status) => {});

    return () => {
      AgoraEngineService.removeAllListeners();
      AgoraEngineService.leaveChannel();
      client.logout();
      channel?.current?.leave();
      dispatch(resetMeetingState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveMeeting = useCallback(async () => {
    try {
      await MeetingService.leaveMeeting(Number(meetingId));
    } finally {
      dispatch(resetMeetingState());
      navigate('/home', { replace: true });
    }
  }, [meetingId, dispatch, navigate]);

  const [messageApi] = useMessage();

  useEffect(() => {
    if (!meetingDetail) {
      return;
    }
    client
      .login({
        uid: meetingDetail?.user?.agUid?.toString() || '',
        token: meetingDetail?.user?.agRtmToken || '',
      })
      .then(() => {
        const newChannel = client.createChannel(
          meetingDetail?.room?.channelName || '',
        );
        channel.current = newChannel;
        newChannel.on('ChannelMessage', (message: RtmMessage, memberId: string) => {
          const data = message as RtmTextMessage;
          if (data) {
            const rtmMessage: AgoraRtmMessage = JSON.parse(data.text);
            if (rtmMessage.message_type === 'NEW_CHAT') {
              const chat: MeetingChat = camelizeKeys(
                rtmMessage.message_content,
              );
              dispatch(addChat(chat));
            } else if (rtmMessage.message_type === 'ACTION') {
              switch (rtmMessage.message_sub_type) {
                case 'END_MEETING':
                  messageApi.info('Cuộc họp đã kết thúc');
                  leaveMeeting();
                  break;

                case 'ROOM_REACTION':
                  dispatch(setReaction({ agUid: Number(memberId), reaction: rtmMessage.message_content }));
                  break;

                default:
                  break;
              }
            }
          }
        });
        return channel.current?.join();
      })
      .catch(() => {});

    const result = AgoraEngineService.joinChannel(
      meetingDetail?.user?.agRtcToken || '',
      meetingDetail?.room?.channelName || '',
      meetingDetail?.user?.agUid || 0,
      {
        // Set the channel scene to live broadcast scene
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        // Set the user role to anchor; if you want to set the user role to audience, keep the default value
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        // Publish the audio collected by the microphone
        publishMicrophoneTrack: true,
        // Publish the video captured by the camera
        publishCameraTrack: true,
        // Automatically subscribe to all audio streams
        autoSubscribeAudio: true,
        // Automatically subscribe to all video streams
        autoSubscribeVideo: true,
      },
    );

    AgoraEngineService.enableVideo();
    AgoraEngineService.enableAudio();
    AgoraEngineService.updateChannelMediaOptions({
      publishCameraTrack: true,
    });

    // Enable local video preview
    AgoraEngineService.startPreview();

    // Register event handler
    AgoraEngineService.registerEventHandler(eventHandler);
    if (result === 0) {
      const enableAudio = meetingDetail?.user?.enableAudio === 1;
      const enableVideo = meetingDetail?.user?.enableVideo === 1;
      setEnableMic(enableAudio);
      setEnableCamera(enableVideo);

      if (enableAudio) {
        AgoraEngineService.muteLocalAudioStream(false);
      } else {
        AgoraEngineService.muteLocalAudioStream(true);
      }

      if (enableVideo) {
        AgoraEngineService.muteLocalVideoStream(false);
      } else {
        AgoraEngineService.muteLocalVideoStream(true);
      }
    } else {
      setIsError(true);
    }
  }, [meetingDetail, client, eventHandler, dispatch, messageApi, leaveMeeting]);

  return {
    // states
    isConnected,
    isError,
    enableCamera,
    enableMic,
    sources,
    isSharing,
    // setters
    setIsConnected,
    setIsError,
    setEnableCamera,
    setEnableMic,
    setSources,
    setIsSharing,
    toggleMic,
    toggleCamera,
    leaveMeeting,
    startSharingScreen,
    stopSharingScreen,
    sendMessage,
    sendReaction,
    meetingUsers,
    meetingDetail,
    meetingId,
    remoteUsers,
  };
};
