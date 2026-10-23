import { ReactNode, useEffect, useRef, useState } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { MeetingUser } from '@/renderer/shared/types/meeting';
import type { VisibleStreams } from '@/renderer/shared/hooks/useRemoteVideoSubscriptions';
import './MeetingStage.scss';

export type MeetingViewMode = 'speaker' | 'gallery';

/** Gallery tiles per page (3x3), as on mobile. */
const PAGE_SIZE = 9;

/** Up to this many gallery tiles are big enough to want the full stream. */
const HIGH_QUALITY_TILES = 4;

type Props = {
  view: MeetingViewMode;
  /** Other participants in the call. */
  others: MeetingUser[];
  /** Me, shown in a floating corner tile (alone: the whole stage). */
  self?: MeetingUser;
  /** Speaker view's main tile: whoever shares, else whoever spoke last. */
  heroUid?: number;
  /** Highlighted in the gallery while talking. */
  activeSpeakerUid?: number;
  /** Presenter: always gets the full stream (text must stay readable). */
  sharingUid?: number;
  /** Called when the set of on-screen remote videos changes. */
  onVisibleStreamsChange?: (streams: VisibleStreams) => void;
  renderTile: (user: MeetingUser) => ReactNode;
};

/** Grid shape for a gallery page, like mobile's GalleryView. */
const gridFor = (n: number) => {
  let cols = 3;
  if (n <= 1) cols = 1;
  else if (n <= 4) cols = 2;
  return { cols, rows: Math.max(1, Math.ceil(n / cols)) };
};

/**
 * The meeting's video area, mirroring the mobile layouts:
 * - Speaker: one participant fills the stage.
 * - Gallery: adaptive grid, 9 per page, active speaker outlined.
 * My own video floats in a corner either way.
 */
export function MeetingStage({
  view,
  others,
  self,
  heroUid,
  activeSpeakerUid,
  sharingUid,
  onVisibleStreamsChange,
  renderTile,
}: Props) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(others.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);

  const current = Math.min(page, pages - 1);
  const hero = others.find((u) => u.agUid === heroUid) ?? others[0];
  const shown =
    view === 'speaker'
      ? others.filter((u) => u === hero)
      : others.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  // Tell the parent which videos to receive, and at what quality.
  const reported = useRef('');
  useEffect(() => {
    const uids = shown
      .map((u) => u.agUid)
      .filter((uid): uid is number => !!uid);
    const allHigh = view === 'speaker' || uids.length <= HIGH_QUALITY_TILES;
    const streams: VisibleStreams = {
      high: uids.filter((uid) => allHigh || uid === sharingUid),
      low: uids.filter((uid) => !allHigh && uid !== sharingUid),
    };
    const key = JSON.stringify(streams);
    if (key === reported.current) return;
    reported.current = key;
    onVisibleStreamsChange?.(streams);
  });

  if (others.length === 0) {
    return (
      <div className="meeting-stage">
        {self && <div className="meeting-stage-solo">{renderTile(self)}</div>}
        <p className="meeting-stage-hint">Đang chờ mọi người tham gia…</p>
      </div>
    );
  }

  let content: ReactNode;
  if (view === 'speaker') {
    content = <div className="meeting-stage-hero">{renderTile(hero)}</div>;
  } else {
    const { cols, rows } = gridFor(shown.length);
    content = (
      <>
        <div
          className={`meeting-stage-gallery${shown.length === 1 ? ' single' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {shown.map((user) => (
            <div
              key={user.agUid}
              className={`meeting-stage-cell${
                user.agUid === activeSpeakerUid ? ' speaking' : ''
              }`}
            >
              {renderTile(user)}
            </div>
          ))}
        </div>
        {pages > 1 && (
          <div className="meeting-stage-pager">
            <button
              type="button"
              aria-label="Trang trước"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <LeftOutlined />
            </button>
            {Array.from({ length: pages }, (_, i) => (
              <span
                key={i}
                className={`meeting-stage-dot${i === current ? ' active' : ''}`}
              />
            ))}
            <button
              type="button"
              aria-label="Trang sau"
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              <RightOutlined />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="meeting-stage">
      {content}
      {self && <div className="meeting-stage-self">{renderTile(self)}</div>}
    </div>
  );
}
