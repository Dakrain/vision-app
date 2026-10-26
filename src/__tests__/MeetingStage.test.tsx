import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MeetingStage } from '../renderer/features/Meeting/components/MeetingStage/MeetingStage';

jest.mock('@/assets/svg/icons', () => () => null, { virtual: true });

const user = (agUid: number, name: string) =>
  ({ agUid, fullName: name, userId: agUid - 700000 }) as any;
const others = [1, 2, 3, 4, 5, 6, 7].map((i) => user(700000 + i, `U${i}`));
const me = user(700100, 'Me');
const tile = (u: any) => (
  <div data-testid={`tile-${u.agUid}`}>{u.fullName}</div>
);
const names = (c: HTMLElement, sel: string) =>
  [...c.querySelectorAll(sel)].map(
    (e) => e.querySelector('[data-testid]')?.textContent,
  );

describe('MeetingStage', () => {
  it('speaker: hero + strip of 4 and +N, recent speakers first', () => {
    const { container, rerender } = render(
      <MeetingStage
        view="speaker"
        others={others}
        self={me}
        heroUid={700003}
        renderTile={tile}
      />,
    );
    expect(names(container, '.meeting-stage-hero')).toEqual(['U3']);
    expect(
      names(container, '.meeting-stage-strip .meeting-stage-cell'),
    ).toEqual(['U1', 'U2', 'U4', 'U5']);
    expect(container.querySelector('.meeting-stage-more')).toHaveTextContent(
      '+2',
    );
    rerender(
      <MeetingStage
        view="speaker"
        others={others}
        self={me}
        heroUid={700006}
        renderTile={tile}
      />,
    );
    // U3 spoke just before: first in the strip.
    expect(
      names(container, '.meeting-stage-strip .meeting-stage-cell')[0],
    ).toBe('U3');
    expect(container.querySelector('.meeting-stage-self')).toBeInTheDocument();
  });

  it('gallery puts spotlight then pin first, with tags', () => {
    const { container } = render(
      <MeetingStage
        view="gallery"
        others={others}
        self={me}
        pinnedUid={700005}
        spotlightUid={700007}
        renderTile={tile}
      />,
    );
    expect(names(container, '.meeting-stage-cell').slice(0, 2)).toEqual([
      'U7',
      'U5',
    ]);
    expect(screen.getByText('Spotlight')).toBeInTheDocument();
    expect(screen.getByText('Đã ghim')).toBeInTheDocument();
  });

  it('large gallery fits 49 per page in 7 columns', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      user(800000 + i, `M${i}`),
    );
    const { container } = render(
      <MeetingStage view="large" others={many} renderTile={tile} />,
    );
    expect(container.querySelectorAll('.meeting-stage-cell')).toHaveLength(30);
    expect(
      (container.querySelector('.meeting-stage-gallery') as HTMLElement).style
        .gridTemplateColumns,
    ).toBe('repeat(6, minmax(0, 1fr))');
    expect(container.querySelector('.meeting-stage-pager')).toBeNull();
  });

  it('focus: only the shared screen, no strip, no self', () => {
    const { container } = render(
      <MeetingStage
        view="focus"
        others={others}
        self={me}
        heroUid={700002}
        sharingUid={700002}
        renderTile={tile}
      />,
    );
    expect(names(container, '.meeting-stage-hero')).toEqual(['U2']);
    expect(container.querySelector('.meeting-stage-strip')).toBeNull();
    expect(container.querySelector('.meeting-stage-self')).toBeNull();
  });

  it('hide self; tile menu reports the action', () => {
    const onTileAction = jest.fn();
    const { container } = render(
      <MeetingStage
        view="speaker"
        others={others.slice(0, 2)}
        self={me}
        hideSelf
        heroUid={700001}
        tileActions={() => ['pin', 'spotlight']}
        onTileAction={onTileAction}
        renderTile={tile}
      />,
    );
    expect(container.querySelector('.meeting-stage-self')).toBeNull();
    fireEvent.click(
      container.querySelector('.meeting-stage-hero .meeting-stage-menu')!,
    );
    fireEvent.click(screen.getByText('Spotlight cho mọi người'));
    expect(onTileAction).toHaveBeenCalledWith(others[0], 'spotlight');
  });
  it('board: content on the main tile, me first in the strip, alone too', () => {
    const { container, rerender } = render(
      <MeetingStage
        view="gallery"
        others={others.slice(0, 2)}
        self={me}
        heroUid={700001}
        content={<div data-testid="board">board</div>}
        renderTile={tile}
      />,
    );
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(container.querySelector('.meeting-stage-gallery')).toBeNull();
    expect(
      names(container, '.meeting-stage-strip .meeting-stage-cell'),
    ).toEqual(['Me', 'U1', 'U2']);
    expect(container.querySelector('.meeting-stage-self')).toBeNull();
    rerender(
      <MeetingStage
        view="speaker"
        others={[]}
        self={me}
        content={<div data-testid="board">board</div>}
        renderTile={tile}
      />,
    );
    expect(screen.getByTestId('board')).toBeInTheDocument();
  });
});
