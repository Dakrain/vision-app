import { MeetingUserTab } from './types';

export const MEETING_USER_TABS: (MeetingUserTab & {
  label:
    | 'meeting.participants.tab_in_room'
    | 'meeting.participants.tab_waiting';
})[] = [
  {
    label: 'meeting.participants.tab_in_room',
    value: 'active',
  },
  {
    label: 'meeting.participants.tab_waiting',
    value: 'pending',
  },
];
