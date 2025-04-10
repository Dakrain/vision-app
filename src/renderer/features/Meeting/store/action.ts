import MeetingService from '@/shared/services/Meeting/MeetingService';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { debounce } from 'lodash';
import { SendChatPayload, UpdateUserConfigPayload } from './types';

export const fetchMeetingDetail = createAsyncThunk(
  'meeting/fetchMeetingDetail',
  async (meetingId: number, { rejectWithValue }) => {
    try {
      const response = await MeetingService.fetchMeetingDetail(meetingId);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const fetchMeetingUsers = createAsyncThunk(
  'meeting/fetchMeetingUsers',
  async (meetingId: number, { rejectWithValue }) => {
    try {
      const response = await MeetingService.fetchMeetingUsers(meetingId);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const startShareScreen = createAsyncThunk(
  'meeting/startShareScreen',
  async (meetingId: number, { rejectWithValue }) => {
    console.log('startShareScreen', meetingId);
    try {
      const response = await MeetingService.updateSetting(meetingId, {
        share_screen: 1,
        enable_video: 1,
        enable_audio: 1,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const stopShareScreen = createAsyncThunk(
  'meeting/stopShareScreen',
  async (meetingId: number, { rejectWithValue }) => {
    console.log('stopShareScreen', meetingId);
    try {
      const response = await MeetingService.updateSetting(meetingId, {
        share_screen: 0,
        enable_video: 0,
        enable_audio: 1,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const updateUserConfig = createAsyncThunk(
  'meeting/updateUserConfig',
  async (
    { meetingId, request }: UpdateUserConfigPayload,
    { rejectWithValue },
  ) => {
    try {
      const response = await MeetingService.updateSetting(meetingId, request);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const sendChat = createAsyncThunk(
  'meeting/sendChat',
  async ({ meetingId, request }: SendChatPayload, { rejectWithValue }) => {
    try {
      const response = await MeetingService.sendChat(meetingId, request);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const fetchChats = createAsyncThunk(
  'meeting/fetchChats',
  async (meetingId: number, { rejectWithValue }) => {
    try {
      const response = await MeetingService.fetchChats(meetingId);
      return response.rows;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

const debounced = debounce(
  (arg: number, dispatch: any) => dispatch(fetchMeetingUsers(arg)),
  300,
);

export const debouncedFetchMeetingUsers = (arg: number) => (dispatch: any) =>
  debounced(arg, dispatch);

const debouncedUpdateUserConfigFn = debounce(
  (arg: UpdateUserConfigPayload, dispatch: any) =>
    dispatch(updateUserConfig(arg)),
  100,
);

export const debouncedUpdateUserConfig =
  (arg: UpdateUserConfigPayload) => (dispatch: any) =>
    debouncedUpdateUserConfigFn(arg, dispatch);

// Thêm action tổng hợp để fetch tất cả dữ liệu meeting
export const fetchAllMeetingData = createAsyncThunk(
  'meeting/fetchAllMeetingData',
  async (meetingId: number, { dispatch, rejectWithValue }) => {
    try {
      // Tạo một mảng các promise từ các action
      const [meetingDetail, meetingUsers, chats] = await Promise.all([
        dispatch(fetchMeetingDetail(meetingId)).unwrap(),
        dispatch(fetchMeetingUsers(meetingId)).unwrap(),
        dispatch(fetchChats(meetingId)).unwrap()
      ]);

      // Trả về tất cả dữ liệu trong một object
      return {
        meetingDetail,
        meetingUsers,
        chats
      };
    } catch (error) {
      console.error('Error fetching meeting data:', error);
      return rejectWithValue(error);
    }
  }
);
