import { WhiteboardSync } from '../renderer/shared/utils/whiteboardSync';

jest.useFakeTimers();

// Two peers wired through a fake RTM channel.
const pair = () => {
  const a: WhiteboardSync = new WhiteboardSync((t, c: any) => deliver(b, t, c));
  const b: WhiteboardSync = new WhiteboardSync((t, c: any) => deliver(a, t, c));
  function deliver(to: WhiteboardSync, type: string, c: any) {
    if (type === 'WB_ELEMENTS')
      to.remote(c.id, JSON.parse(JSON.stringify(c.els)));
    if (type === 'WB_SYNC') to.sendAll();
  }
  a.open('board');
  b.open('board');
  return { a, b };
};
const rect = (id: string) => ({
  id,
  type: 'rectangle',
  version: 1,
  versionNonce: 5,
  width: 0,
  index: 'a0',
});

describe('WhiteboardSync', () => {
  it('sends edits Excalidraw makes in place', () => {
    const { a, b } = pair();
    const el = rect('r1');
    a.local([el]);
    jest.advanceTimersByTime(200);
    // Excalidraw mutates the same object while the shape is dragged.
    el.version = 2;
    el.versionNonce = 9;
    el.width = 200;
    a.local([el]);
    jest.advanceTimersByTime(200);
    expect(b.elements()).toEqual([
      expect.objectContaining({ id: 'r1', version: 2, width: 200 }),
    ]);
  });

  it('does not echo what it received', () => {
    const send = jest.fn();
    const s = new WhiteboardSync(send);
    s.open('board');
    const el = rect('r1');
    s.remote('board', [el]);
    s.local([el]);
    jest.advanceTimersByTime(200);
    expect(send).not.toHaveBeenCalled();
  });

  it('higher version wins, ties go to the lower nonce', () => {
    const s = new WhiteboardSync(() => {});
    s.open('board');
    s.remote('board', [{ ...rect('r1'), version: 3, versionNonce: 7 }]);
    s.remote('board', [{ ...rect('r1'), version: 2, versionNonce: 1 }]);
    s.remote('board', [
      { ...rect('r1'), version: 3, versionNonce: 4, width: 9 },
    ]);
    expect(s.elements()[0]).toMatchObject({
      version: 3,
      versionNonce: 4,
      width: 9,
    });
  });

  it('deletes elsewhere a shape Excalidraw dropped', () => {
    const { a, b } = pair();
    a.local([rect('ghost')]);
    jest.advanceTimersByTime(200);
    a.local([]);
    jest.advanceTimersByTime(200);
    expect(b.elements()[0]).toMatchObject({ id: 'ghost', isDeleted: true });
  });

  it('ignores another board and catches up on request', () => {
    const { a, b } = pair();
    b.remote('old-board', [rect('x')]);
    expect(b.elements()).toHaveLength(0);
    a.local([rect('r1'), { ...rect('r2'), index: 'a1' }]);
    b.close();
    b.open('board');
    b.requestAll();
    jest.advanceTimersByTime(1000);
    expect(b.elements().map((e) => e.id)).toEqual(['r1', 'r2']);
  });
});
