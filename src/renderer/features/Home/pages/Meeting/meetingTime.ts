import type { MeetingListItem } from '@/shared/types/meeting';

/** When the meeting starts (or started), as a Date. */
export const meetingDate = (meeting: MeetingListItem) =>
  new Date(((meeting.startTime || meeting.createdAt) ?? 0) * 1000);

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "HÔM NAY", "NGÀY MAI", or e.g. "THỨ SÁU, 07/05/2021". */
export const dayLabel = (date: Date, now = new Date()) => {
  if (sameDay(date, now)) return 'HÔM NAY';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'NGÀY MAI';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'HÔM QUA';
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
  const day = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${weekday}, ${day}`.toUpperCase();
};

/** "9:00AM (GMT+7)" in the user's own time zone. */
export const timeLabel = (date: Date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const gmt = `GMT${sign}${offsetHours}${
    offsetMinutes ? `:${String(offsetMinutes).padStart(2, '0')}` : ''
  }`;
  return `${hours % 12 || 12}:${minutes}${suffix} (${gmt})`;
};

/** Consecutive meetings that fall on the same day, keeping list order. */
export const groupByDay = (meetings: MeetingListItem[]) => {
  const groups: { label: string; meetings: MeetingListItem[] }[] = [];
  meetings.forEach((meeting) => {
    const label = dayLabel(meetingDate(meeting));
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.meetings.push(meeting);
    } else {
      groups.push({ label, meetings: [meeting] });
    }
  });
  return groups;
};
