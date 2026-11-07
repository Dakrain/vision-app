/** What a meeting is shared by: its ID and password, and the API's link. */
interface Shareable {
  visionMeetingKey?: string;
  visionMeetingPwd?: string;
  joinUrl?: string;
}

/**
 * The link to share for a meeting: the web invite page with its ID and
 * password, which opens the installed app on every platform
 * (vision20://meetinginvite?…) — not the API's joinUrl, a Firebase Dynamic
 * Link (a service Google shut down; it sent Android to an old Play
 * listing). joinUrl only when there is no ID.
 */
export const inviteUrl = (meeting: Shareable): string => {
  const key = meeting.visionMeetingKey ?? '';
  if (!key) return meeting.joinUrl ?? '';
  const url = new URL('https://vision20.us/events/meetinginvite');
  url.searchParams.set('meeting_id', key);
  if (meeting.visionMeetingPwd) {
    url.searchParams.set('password', meeting.visionMeetingPwd);
  }
  return url.toString();
};
