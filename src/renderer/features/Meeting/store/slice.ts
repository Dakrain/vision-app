/* eslint-disable @typescript-eslint/no-shadow */
import { MeetingChat } from '@/renderer/shared/types/meeting';
import { createSlice } from '@reduxjs/toolkit';
import { random } from 'lodash';
import {
  fetchAllMeetingData,
  fetchChats,
  fetchMeetingDetail,
  fetchMeetingUsers,
  sendChat,
  startShareScreen,
  stopShareScreen,
  updateUserConfig,
} from './action';
import INITIAL_STATE from './constants';

export const NS_MEETING = 'meeting';

export const meetingSlice = createSlice({
  name: NS_MEETING,
  initialState: INITIAL_STATE,
  reducers: {
    userReaction: (state, action) => {
      const userAguid = state.meetingDetail?.user?.agUid;

      // find user index
      const userIndex = state.meetingUsers.findIndex(
        (user) => user.agUid === userAguid,
      );

      if (userIndex >= 0) {
        state.meetingUsers[userIndex].reaction = action.payload;
      }
    },
    setReaction: (state, action) => {
      const { agUid, reaction } = action.payload;

      const userIndex = state.meetingUsers.findIndex(
        (user) => user.agUid === agUid,
      );

      if (userIndex >= 0) {
        state.meetingUsers[userIndex].reaction = reaction;
      }
    },
    setMeetingDetail: (state, action) => {
      state.meetingDetail = action.payload;
    },
    addAgoraMember: (state, action) => {
      state.agoraMembers = [...state.agoraMembers, action.payload];
    },
    removeAgoraMember: (state, action) => {
      state.agoraMembers = state.agoraMembers.filter(
        (member) => member !== action.payload,
      );
    },
    removeMeetingUser: (state, action) => {
      state.meetingUsers = state.meetingUsers.filter(
        (user) => user.agUid !== action.payload,
      );
    },
    remoteUserMutedAudio: (state, action) => {
      const { agUid, muted } = action.payload;
      const userIndex = state.meetingUsers.findIndex(
        (user) => user.agUid === agUid,
      );

      if (userIndex >= 0) {
        state.meetingUsers = state.meetingUsers.map((user, index) =>
          index === userIndex ? { ...user, enableAudio: muted ? 0 : 1 } : user,
        );
      }
    },
    remoteUserMutedVideo: (state, action) => {
      const { agUid, muted } = action.payload;
      const userIndex = state.meetingUsers.findIndex(
        (user) => user.agUid === agUid,
      );

      if (userIndex >= 0) {
        state.meetingUsers = state.meetingUsers.map((user, index) =>
          index === userIndex ? { ...user, enableVideo: muted ? 0 : 1 } : user,
        );
      }
    },
    resetMeetingState: () => {
      return INITIAL_STATE;
    },
    addChat: (state, action) => {
      state.chats = [...state.chats, action.payload];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMeetingDetail.fulfilled, (state, action) => {
      state.meetingDetail = action.payload;
    });
    builder.addCase(startShareScreen.pending, (state, action) => {
      const stateUser = state.meetingDetail?.user;

      if (stateUser) {
        const userIndex = state.meetingUsers.findIndex(
          (user) => user.agUid === stateUser.agUid,
        );

        if (userIndex >= 0) {
          state.meetingUsers = state.meetingUsers.map((user, index) =>
            index === userIndex
              ? {
                  ...user,
                  enableVideo: 1,
                  enableAudio: 1,
                }
              : user,
          );
        }
      }
    });
    builder.addCase(stopShareScreen.pending, (state, action) => {
      const stateUser = state.meetingDetail?.user;

      if (stateUser) {
        const userIndex = state.meetingUsers.findIndex(
          (user) => user.agUid === stateUser.agUid,
        );

        if (userIndex >= 0) {
          state.meetingUsers = state.meetingUsers.map((user, index) =>
            index === userIndex
              ? {
                  ...user,
                  enableVideo: 0,
                  enableAudio: 0,
                }
              : user,
          );
        }
      }
    });
    builder.addCase(fetchMeetingUsers.fulfilled, (state, action) => {
      state.meetingUsers = action.payload.rows ?? [];
    });
    builder.addCase(updateUserConfig.pending, (state, action) => {
      const stateUser = state.meetingDetail?.user;

      if (stateUser) {
        const userIndex = state.meetingUsers.findIndex(
          (user) => user.agUid === stateUser.agUid,
        );

        if (userIndex >= 0) {
          state.meetingUsers = state.meetingUsers.map((user, index) =>
            index === userIndex
              ? {
                  ...user,
                  enableVideo:
                    action.meta.arg.request?.enable_video ||
                    stateUser.enableVideo,
                  enableAudio:
                    action.meta.arg.request?.enable_audio ||
                    stateUser.enableAudio,
                }
              : user,
          );
        }
      }
    });
    builder.addCase(sendChat.pending, (state, action) => {
      const message: MeetingChat = {
        avatar: action.meta?.arg?.user?.avatarUrl,
        createdAt: new Date().getTime(),
        id: random(10000).toString(),
        messageType: action.meta?.arg?.request?.type,
        message: action.meta?.arg?.request?.message,
        userName: action.meta?.arg?.user?.fullName,
        userId: action.meta?.arg?.user?.id,
      };
      state.chats = [...state.chats, message];
    });

    builder.addCase(sendChat.fulfilled, (state, action) => {
      const { callback } = action.meta.arg;
      callback(action.payload);
    });

    builder.addCase(fetchChats.fulfilled, (state, action) => {
      state.chats = action.payload;
    });

    builder
      .addCase(fetchAllMeetingData.fulfilled, (state, action) => {
        state.meetingDetail = action.payload.meetingDetail;
        state.meetingUsers = action.payload.meetingUsers.rows ?? [];
        state.chats = action.payload.chats;
      })
     ;
  },
});
export const {
  setMeetingDetail,
  removeMeetingUser,
  addAgoraMember,
  removeAgoraMember,
  remoteUserMutedAudio,
  remoteUserMutedVideo,
  resetMeetingState,
  addChat,
  userReaction,
  setReaction,
} = meetingSlice.actions;
export default meetingSlice.reducer;
