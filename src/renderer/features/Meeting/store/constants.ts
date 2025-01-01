import { StateType } from './state';

const INITIAL_STATE: StateType = {
  meetingUsers: [],
  cameraOn: false,
  microphoneOn: true,
  speakerOn: false,
  sharingScreen: false,
  agoraMembers: [],
  chats: [],
};

export default INITIAL_STATE;
