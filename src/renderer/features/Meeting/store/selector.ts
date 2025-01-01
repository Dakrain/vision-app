import { RootState } from '@/store/configureStore';

export const selectMeetingDetail = (state: RootState) =>
  state.meeting.meetingDetail;
export const selectMeetingUsers = (state: RootState) =>
  state.meeting.meetingUsers;

export const selectChats = (state: RootState) => state.meeting.chats;
