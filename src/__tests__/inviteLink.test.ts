import { inviteUrl } from '../renderer/shared/utils/inviteLink';

// The link a meeting is shared with: the web invite page (it opens the
// installed app on every platform), not the API's join_url — a Firebase
// Dynamic Link (shut down; it sent Android to an old Play listing).
describe('inviteUrl', () => {
  it('is the web invite page with the meeting ID and password', () => {
    expect(
      inviteUrl({
        visionMeetingKey: '9DD648',
        visionMeetingPwd: 'EB6D66D3',
        joinUrl: 'https://vision20.page.link/RDE3',
      }),
    ).toBe(
      'https://vision20.us/events/meetinginvite?meeting_id=9DD648&password=EB6D66D3',
    );
  });

  it('leaves the password out when there is none', () => {
    expect(inviteUrl({ visionMeetingKey: 'K1' })).toBe(
      'https://vision20.us/events/meetinginvite?meeting_id=K1',
    );
  });

  it('without a meeting ID, whatever join link the API gave', () => {
    expect(inviteUrl({ joinUrl: 'https://vision20.page.link/RDE3' })).toBe(
      'https://vision20.page.link/RDE3',
    );
    expect(inviteUrl({})).toBe('');
  });
});
