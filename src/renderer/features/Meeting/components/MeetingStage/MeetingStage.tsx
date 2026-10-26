import { ReactNode, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { MeetingUser } from '@/renderer/shared/types/meeting';
import type { VisibleStreams } from '@/renderer/shared/hooks/useRemoteVideoSubscriptions';
import Icon from '@/assets/svg/icons';
import './MeetingStage.scss';

/**
 * Layouts, after Teams:
 * - speaker: one main tile, the others in a strip below it.
 * - gallery: grid of up to 9 per page.
 * - large: grid of up to 49 per page (big rooms).
 * - focus: only the shared screen while someone shares (else speaker).
 */
export type MeetingViewMode = 'speaker' | 'gallery' | 'large' | 'focus';

export const MEETING_VIEW_MODES: MeetingViewMode[] = [
  'speaker',
  'gallery',
  'large',
  'focus',
];

/** Tiles per gallery page: 3x3 (as on mobile), 7x7 in the large gallery. */
const PAGE_SIZE: Record<'gallery' | 'large', number> = {
  gallery: 9,
  large: 49,
};

/** Up to this many gallery tiles are big enough to want the full stream. */
const HIGH_QUALITY_TILES = 4;

/** Speaker view's strip under the main tile (more: a "+N" tile). */
const STRIP_SIZE = 5;

export type TileMenuAction = 'pin' | 'unpin' | 'spotlight' | 'unspotlight';

type Props = {
  view: MeetingViewMode;
  /** Other participants in the call. */
  others: MeetingUser[];
  /** Me, shown in a floating corner tile (alone: the whole stage). */
  self?: MeetingUser;
  /** Keep my own floating tile out of sight (it still shows when alone). */
  hideSelf?: boolean;
  /**
   * Main tile: whoever shares, else the spotlight, my pin, or whoever
   * spoke last (resolved by the parent).
   */
  heroUid?: number;
  /** Pinned by me: first in the gallery, labelled. */
  pinnedUid?: number;
  /** Put on everyone's stage by a host: first in the gallery, labelled. */
  spotlightUid?: number;
  /** Highlighted in the gallery while talking. */
  activeSpeakerUid?: number;
  /** I am talking: my own tile is highlighted too. */
  selfSpeaking?: boolean;
  /** I am sharing my screen: said in words rather than shown. */
  selfSharing?: boolean;
  /** Presenter: always gets the full stream (text must stay readable). */
  sharingUid?: number;
  /**
   * The presenter's camera (kept on next to their screen): a small tile
   * in speaker view; in the gallery it is one of `others`.
   */
  presenterCam?: MeetingUser;
  /** Actions in a tile's menu (none: no menu). */
  tileActions?: (user: MeetingUser) => TileMenuAction[];
  onTileAction?: (user: MeetingUser, action: TileMenuAction) => void;
  /** Called when the set of on-screen remote videos changes. */
  onVisibleStreamsChange?: (streams: VisibleStreams) => void;
  renderTile: (user: MeetingUser) => ReactNode;
};

const ACTION_LABEL: Record<TileMenuAction, string> = {
  pin: 'Ghim cho tôi',
  unpin: 'Bỏ ghim',
  spotlight: 'Spotlight cho mọi người',
  unspotlight: 'Tắt spotlight',
};

/** Grid shape for a gallery page: as square as the tile count allows. */
const gridFor = (n: number) => {
  let cols = 7;
  if (n <= 1) cols = 1;
  else if (n <= 4) cols = 2;
  else if (n <= 9) cols = 3;
  else if (n <= 16) cols = 4;
  else if (n <= 25) cols = 5;
  else if (n <= 36) cols = 6;
  return { cols, rows: Math.max(1, Math.ceil(n / cols)) };
};

/**
 * The meeting's video area (layouts: see `MeetingViewMode`). In speaker
 * view whoever spoke last fills the stage and stays there until someone
 * else talks; the strip below lists the most recent speakers first. My own
 * video floats in a corner unless hidden.
 */
export function MeetingStage({
  view,
  others,
  self,
  hideSelf = false,
  heroUid,
  pinnedUid,
  spotlightUid,
  activeSpeakerUid,
  selfSpeaking = false,
  selfSharing = false,
  sharingUid,
  presenterCam,
  tileActions,
  onTileAction,
  onVisibleStreamsChange,
  renderTile,
}: Props) {
  // Focus only differs from speaker view while something is shared.
  const focus = view === 'focus' && sharingUid !== undefined;
  const layout: 'speaker' | 'gallery' | 'large' =
    view === 'focus' ? 'speaker' : view;
  const pageSize = layout === 'speaker' ? 1 : PAGE_SIZE[layout];

  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(others.length / pageSize));
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

  // Stable sort by `rank`: everyone else keeps the room's order.
  const sortBy = (list: MeetingUser[], rank: (u: MeetingUser) => number) =>
    list
      .map((u, i) => ({ u, i }))
      .sort((a, b) => rank(a.u) - rank(b.u) || a.i - b.i)
      .map(({ u }) => u);
  const rankIn = (uids: number[]) => (u: MeetingUser) => {
    const i = uids.indexOf(u.agUid ?? -1);
    return i < 0 ? uids.length : i;
  };

  const current = Math.min(page, pages - 1);
  const hero = others.find((u) => u.agUid === heroUid) ?? others[0];
  const rest = sortBy(
    // The presenter's camera has its own floating tile.
    others.filter((u) => u !== hero && u !== presenterCam),
    rankIn(recent),
  );
  let strip = rest.length > STRIP_SIZE ? rest.slice(0, STRIP_SIZE - 1) : rest;
  if (focus) strip = [];
  const hidden = focus ? 0 : rest.length - strip.length;
  const showPresenterCam = layout === 'speaker' && !focus && !!presenterCam;
  // The spotlight, then my pin, lead the gallery.
  const featured = [spotlightUid, pinnedUid].filter(
    (uid): uid is number => uid !== undefined,
  );
  const shown =
    layout === 'speaker'
      ? [hero, ...strip].filter(Boolean)
      : sortBy(others, rankIn(featured)).slice(
          current * pageSize,
          (current + 1) * pageSize,
        );

  // Tell the parent which videos to receive, and at what quality.
  const reported = useRef('');
  useEffect(() => {
    const uids = shown
      .map((u) => u.agUid)
      .filter((uid): uid is number => !!uid);
    // Speaker view: only the main tile is big; large gallery: all small.
    const big = (uid: number) => {
      if (layout === 'speaker') return uid === hero?.agUid;
      if (uid === sharingUid) return true;
      return layout === 'gallery' && uids.length <= HIGH_QUALITY_TILES;
    };
    const streams: VisibleStreams = {
      high: uids.filter(big),
      low: uids.filter((uid) => !big(uid)),
    };
    if (showPresenterCam && presenterCam?.agUid) {
      streams.low.push(presenterCam.agUid);
    }
    const key = JSON.stringify(streams);
    if (key === reported.current) return;
    reported.current = key;
    onVisibleStreamsChange?.(streams);
  });

  // A tile with its label and menu.
  const frame = (user: MeetingUser, className: string) => {
    const actions = tileActions?.(user) ?? [];
    let tag: string | undefined;
    if (user.agUid === spotlightUid) tag = 'Spotlight';
    else if (user.agUid === pinnedUid) tag = 'Đã ghim';
    return (
      <div
        key={user.agUid}
        className={`${className}${
          user.agUid === activeSpeakerUid ? ' speaking' : ''
        }`}
      >
        {renderTile(user)}
        {tag && <span className="meeting-stage-tag">{tag}</span>}
        {actions.length > 0 && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: actions.map((action) => ({
                key: action,
                label: ACTION_LABEL[action],
              })),
              onClick: ({ key }) => onTileAction?.(user, key as TileMenuAction),
            }}
          >
            <button
              type="button"
              className="meeting-stage-menu"
              title="Tuỳ chọn"
              aria-label="Tuỳ chọn"
            >
              <Icon name="memberDots" />
            </button>
          </Dropdown>
        )}
      </div>
    );
  };

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
        {selfSharing && (
          <div className="meeting-stage-sharing">Bạn đang chia sẻ màn hình</div>
        )}
        <p className="meeting-stage-hint">Đang chờ mọi người tham gia…</p>
      </div>
    );
  }

  let content: ReactNode;
  if (layout === 'speaker') {
    content = (
      <>
        {frame(hero, 'meeting-stage-hero')}
        {strip.length > 0 && (
          <div className="meeting-stage-strip">
            {strip.map((user) => frame(user, 'meeting-stage-cell'))}
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
          className={`meeting-stage-gallery${
            shown.length === 1 ? ' single' : ''
          }${layout === 'large' ? ' large' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {shown.map((user) => frame(user, 'meeting-stage-cell'))}
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

  const hasStrip = layout === 'speaker' && strip.length > 0;
  return (
    <div className={`meeting-stage${hasStrip ? ' has-strip' : ''}`}>
      {content}
      {selfSharing && (
        <div className="meeting-stage-sharing">Bạn đang chia sẻ màn hình</div>
      )}
      {self && !hideSelf && !focus && (
        <div className={`meeting-stage-self${selfSpeaking ? ' speaking' : ''}`}>
          {renderTile(self)}
        </div>
      )}
      {showPresenterCam && presenterCam && (
        <div className="meeting-stage-presenter">
          {renderTile(presenterCam)}
        </div>
      )}
    </div>
  );
}
