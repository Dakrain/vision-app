import { MEETING_DEFAULTS } from '../renderer/shared/components/CreateMeetingDialog/meetingDefaults';

describe('new meeting defaults', () => {
  it('takes 30 people', () => {
    expect(MEETING_DEFAULTS.limitUser).toBe(30);
  });

  it('lets everyone share the screen (and so open the whiteboard)', () => {
    expect(MEETING_DEFAULTS.allowShare).toBe(true);
  });
});
