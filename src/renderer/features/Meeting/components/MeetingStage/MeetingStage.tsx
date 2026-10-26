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

/** Speaker view's strip under the main tile (more: a "+N" tile). */
const STRIP_SIZE = 5;

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
  /** I am talking: my own tile is highlighted too. */
  selfSpeaking?: boolean;
  /** Presenter: always gets the full stream (text must stay readable). */
  sharingUid?: number;
  /**
   * The presenter's camera (kept on next to their screen): a small tile
   * in speaker view; in the gallery it is one of `others`.
   */
  presenterCam?: MeetingUser;
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
 * - Speaker (like Teams): whoever spoke last fills the stage and stays
 *   there until someone else talks; everyone else sits in a strip below,
 *   most recent speakers first.
 * - Gallery: adaptive grid, 9 per page, active speaker outlined.
 * My own video floats in a corner either way.
 */
export function MeetingStage({
  view,
  others,
  self,
  heroUid,
  activeSpeakerUid,
  selfSpeaking = false,
  sharingUid,
  presenterCam,
  onVisibleStreamsChange,
  renderTile,
}: Props) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(others.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);

  // Who took the stage, most recent first: orders the strip so the people
  // in the conversation stay in sight.
  const [recent, setRecent] = useState<number[]>([]);
  useEffect(() => {
    if (heroUid === undefined) return;
    setRecent((prev) =>
      prev[0] === heroUid
        ? prev
        : [heroUid, ...prev.filter((uid) => uid !== heroUid)],
    );
  }, [heroUid]);

  const current = Math.min(page, pages - 1);
  const hero = others.find((u) => u.agUid === heroUid) ?? others[0];
  const rank = (u: MeetingUser) => {
    const i = recent.indexOf(u.agUid ?? -1);
    return i < 0 ? recent.length : i;
  };
  // Stable sort: people who never spoke keep the room's order.
  const rest = others
    // The presenter's camera has its own floating tile.
    .filter((u) => u !== hero && u !== presenterCam)
    .map((u, i) => ({ u, i }))
    .sort((a, b) => rank(a.u) - rank(b.u) || a.i - b.i)
    .map(({ u }) => u);
  const strip = rest.length > STRIP_SIZE ? rest.slice(0, STRIP_SIZE - 1) : rest;
  const hidden = rest.length - strip.length;
  const shown =
    view === 'speaker'
      ? [hero, ...strip].filter(Boolean)
      : others.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  // Tell the parent which videos to receive, and at what quality.
  const reported = useRef('');
  useEffect(() => {
    const uids = shown
      .map((u) => u.agUid)
      .filter((uid): uid is number => !!uid);
    // Speaker view: only the main tile is big.
    const big = (uid: number) =>
      view === 'speaker'
        ? uid === hero?.agUid
        : uids.length <= HIGH_QUALITY_TILES || uid === sharingUid;
    const streams: VisibleStreams = {
      high: uids.filter(big),
      low: uids.filter((uid) => !big(uid)),
    };
    if (view === 'speaker' && presenterCam?.agUid) {
      streams.low.push(presenterCam.agUid);
    }
    const key = JSON.stringify(streams);
    if (key === reported.current) return;
    reported.current = key;
    onVisibleStreamsChange?.(streams);
  });

  if (others.length === 0) {
    return (
      <div className="meeting-stage">
        {self && (
          <div
            className={`meeting-stage-solo${selfSpeaking ? ' speaking' : ''}`}
          >
            {renderTile(self)}
          </div>
        )}
        <p className="meeting-stage-hint">Đang chờ mọi người tham gia…</p>
      </div>
    );
  }

  let content: ReactNode;
  if (view === 'speaker') {
    content = (
      <>
        <div
          className={`meeting-stage-hero${
            hero.agUid === activeSpeakerUid ? ' speaking' : ''
          }`}
        >
          {renderTile(hero)}
        </div>
        {strip.length > 0 && (
          <div className="meeting-stage-strip">
            {strip.map((user) => (
              <div
                key={user.agUid}
                className={`meeting-stage-cell${
                  user.agUid === activeSpeakerUid ? ' speaking' : ''
                }`}
              >
                {renderTile(user)}
              </div>
            ))}
            {hidden > 0 && <div className="meeting-stage-more">+{hidden}</div>}
          </div>
        )}
      </>
    );
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

  const hasStrip = view === 'speaker' && strip.length > 0;
  return (
    <div className={`meeting-stage${hasStrip ? ' has-strip' : ''}`}>
      {content}
      {self && (
        <div className={`meeting-stage-self${selfSpeaking ? ' speaking' : ''}`}>
          {renderTile(self)}
        </div>
      )}
      {view === 'speaker' && presenterCam && (
        <div className="meeting-stage-presenter">
          {renderTile(presenterCam)}
        </div>
      )}
    </div>
  );
}
