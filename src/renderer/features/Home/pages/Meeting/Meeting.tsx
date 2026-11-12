import Icon from '@/assets/svg/icons';
import useLoading from '@/shared/hooks/useLoading';
import { MeetingService } from '@/shared/services/Meeting';
import { MeetingStatus, type MeetingListItem } from '@/shared/types/meeting';
import { notification, Spin } from 'antd';
import {
  type JSX,
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { inviteUrl } from '@/shared/utils/inviteLink';
import { confirmDialog } from '@/renderer/shared/utils/confirmDialog';
import { EditMeetingDialog } from './components/EditMeetingDialog';
import { MeetingCard } from './components/MeetingCard';
import { groupByDay, sortMeetings } from './meetingTime';
import './Meeting.scss';

const { clipboard } = window.require('electron');

type ListTab = 'live' | 'upcoming';

const TABS: {
  key: ListTab;
  label: 'meeting.list.tab_live' | 'meeting.list.tab_upcoming';
  status: number;
  sort: string;
}[] = [
  {
    key: 'live',
    label: 'meeting.list.tab_live',
    status: MeetingStatus.GOING_ON,
    sort: 'm.created_at:desc',
  },
  {
    key: 'upcoming',
    label: 'meeting.list.tab_upcoming',
    status: MeetingStatus.NEW,
    // The API wants the bare column ('m.start_time' is silently ignored).
    sort: 'start_time:asc',
  },
];

/** Meetings come and go while the page is open (others start/end them). */
const REFRESH_MS = 30_000;

interface MeetingProps {
  openJoinMeetingDialog: () => void;
  openCreateMeetingDialog: () => void;
  openScheduleMeetingDialog: () => void;
  /** Bumped by the parent after a meeting is scheduled. */
  refreshKey: number;
}

// First page of each tab, kept across remounts (the tab is rebuilt on every
// visit and on the way back from a meeting): it shows at once, refreshed
// behind it, instead of a spinner each time.
const firstPageCache = new Map<ListTab, MeetingListItem[]>();

function Meeting({
  openJoinMeetingDialog,
  openCreateMeetingDialog,
  openScheduleMeetingDialog,
  refreshKey,
}: MeetingProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { withLoading } = useLoading();
  const [tab, setTab] = useState<ListTab>('upcoming');
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<MeetingListItem>();
  // Drops responses of a tab the user already left.
  const requestId = useRef(0);

  const load = useCallback(
    async (pageNumber: number, silent = false) => {
      const { status, sort } = TABS.find((item) => item.key === tab)!;
      requestId.current += 1;
      const id = requestId.current;
      if (!silent) setLoading(true);
      try {
        const res = await MeetingService.fetchMeetings({
          status,
          sort,
          pageNumber,
        });
        if (id !== requestId.current) return;
        const rows = res.rows ?? [];
        if (pageNumber === 1) firstPageCache.set(tab, rows);
        setMeetings((prev) => (pageNumber === 1 ? rows : [...prev, ...rows]));
        setPage(pageNumber);
        setHasMore(pageNumber * (res.pageSize || rows.length) < res.total);
        setFailed(false);
      } catch (_) {
        if (id !== requestId.current) return;
        if (!silent) setFailed(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    const cached = firstPageCache.get(tab);
    setMeetings(cached ?? []);
    load(1, !!cached);
  }, [load, refreshKey, tab]);

  // Keep the first page fresh; skip while the user is paging further down.
  useEffect(() => {
    const refresh = () => {
      if (page === 1) load(1, true);
    };
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load, page]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      hasMore &&
      !loading &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - 80
    ) {
      load(page + 1);
    }
  };

  const onStart = useCallback(
    async (meeting: MeetingListItem) => {
      try {
        await withLoading(MeetingService.startMeeting(meeting.id));
        navigate('/meeting/lobby', { state: { meetingId: meeting.id } });
      } catch (_) {
        notification.error({
          message: t('meeting.list.start_failed'),
          placement: 'top',
        });
      }
    },
    [navigate, t, withLoading],
  );

  // Already a member (the list only has my meetings): straight to the lobby.
  const onJoin = useCallback(
    (meeting: MeetingListItem) =>
      navigate('/meeting/lobby', { state: { meetingId: meeting.id } }),
    [navigate],
  );

  const onCopyLink = useCallback(
    (meeting: MeetingListItem) => {
      clipboard.writeText(inviteUrl(meeting));
      notification.success({
        message: t('meeting.list.link_copied'),
        placement: 'top',
      });
    },
    [t],
  );

  const onDelete = useCallback(
    (meeting: MeetingListItem) => {
      confirmDialog({
        title: t('meeting.list.delete_title'),
        content: t('meeting.list.delete_message', { title: meeting.title }),
        okText: t('common.delete'),
        okButtonProps: { danger: true },
        cancelText: t('common.cancel'),
        centered: true,
        onOk: async () => {
          try {
            await MeetingService.deleteMeeting(meeting.id);
            setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
          } catch (_) {
            notification.error({
              message: t('meeting.list.delete_failed'),
              description: t('meeting.list.delete_failed_live'),
              placement: 'top',
            });
          }
        },
      });
    },
    [t],
  );

  const onSaveEdit = async (title: string, description: string) => {
    if (!editing) return;
    try {
      await withLoading(
        MeetingService.updateMeeting(editing.id, { title, description }),
      );
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === editing.id ? { ...m, title, description } : m,
        ),
      );
      setEditing(undefined);
    } catch (_) {
      notification.error({
        message: t('meeting.list.save_failed'),
        placement: 'top',
      });
    }
  };

  const renderList = () => {
    if (loading && meetings.length === 0) {
      return (
        <div className="meetings-state">
          <Spin />
        </div>
      );
    }
    if (failed && meetings.length === 0) {
      return (
        <div className="meetings-state">
          <span>{t('meeting.list.load_failed')}</span>
          <button type="button" onClick={() => load(1)}>
            {t('common.retry')}
          </button>
        </div>
      );
    }
    if (meetings.length === 0) {
      return (
        <div className="meetings-state">
          <span>{t('meeting.list.empty')}</span>
        </div>
      );
    }
    return (
      <>
        {groupByDay(
          sortMeetings(meetings, tab === 'upcoming' ? 'asc' : 'desc'),
        ).map((group) => (
          <section key={group.label} className="meetings-group">
            <h3 className="meetings-group-label">{group.label}</h3>
            <div className="meetings-group-cards">
              {group.meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onStart={onStart}
                  onJoin={onJoin}
                  onEdit={setEditing}
                  onCopyLink={onCopyLink}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        ))}
        {loading && (
          <div className="meetings-more">
            <Spin size="small" />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="meetings-page">
      <div className="meetings-list">
        <div className="meetings-segment" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? 'active' : ''}
              onClick={() => setTab(item.key)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
        <div className="meetings-scroll" onScroll={onScroll}>
          {renderList()}
        </div>
      </div>
      <div className="meetings-actions">
        <div className="meetings-actions-row">
          <button type="button" onClick={openCreateMeetingDialog}>
            <Icon name="meetingNew" />
            <span>{t('meeting.list.new_meeting')}</span>
          </button>
          <button type="button" onClick={openJoinMeetingDialog}>
            <Icon name="meetingJoin" />
            <span>{t('meeting.list.join_meeting')}</span>
          </button>
          <button type="button" onClick={openScheduleMeetingDialog}>
            <Icon name="meetingSchedule" />
            <span>{t('meeting.list.schedule')}</span>
          </button>
        </div>
      </div>
      <EditMeetingDialog
        meeting={editing}
        onClose={() => setEditing(undefined)}
        onSave={onSaveEdit}
      />
    </div>
  );
}

export default Meeting;
