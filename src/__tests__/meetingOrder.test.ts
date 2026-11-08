import { sortMeetings } from '../renderer/features/Home/pages/Meeting/meetingTime';
import type { MeetingListItem } from '../renderer/shared/types/meeting';

const at = (id: number, startTime: number) =>
  ({ id, startTime }) as unknown as MeetingListItem;

describe('sortMeetings', () => {
  const list = [at(1, 300), at(2, 100), at(3, 400), at(4, 200)];

  it('upcoming: the soonest first, whatever order the API sent', () => {
    expect(sortMeetings(list, 'asc').map((m) => m.id)).toEqual([2, 4, 1, 3]);
  });

  it('live: the latest started first', () => {
    expect(sortMeetings(list, 'desc').map((m) => m.id)).toEqual([3, 1, 4, 2]);
  });

  it('leaves the list it was given alone', () => {
    sortMeetings(list, 'asc');
    expect(list.map((m) => m.id)).toEqual([1, 2, 3, 4]);
  });
});
