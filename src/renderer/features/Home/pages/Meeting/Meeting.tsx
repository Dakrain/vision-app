import Icon from '@/assets/svg/icons';
import useLoading from '@/shared/hooks/useLoading';
import { MeetingService } from '@/shared/services/Meeting';
import { MeetingStatus, type MeetingListItem } from '@/shared/types/meeting';
import { Modal, notification, Spin } from 'antd';
import {
  type JSX,
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { EditMeetingDialog } from './components/EditMeetingDialog';
import { MeetingCard } from './components/MeetingCard';
import { groupByDay } from './meetingTime';
import './Meeting.scss';

const { clipboard } = window.require('electron');

type ListTab = 'live' | 'upcoming';

const TABS: { key: ListTab; label: string; status: number; sort: string }[] = [
  {
    key: 'live',
    label: 'Live',
    status: MeetingStatus.GOING_ON,
    sort: 'm.created_at:desc',
  },
  {
    key: 'upcoming',
    label: 'Sắp diễn ra',
    status: MeetingStatus.NEW,
    sort: 'm.start_time:asc',
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
      const { status, sort } = TABS.find((t) => t.key === tab)!;
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
          message: 'Không bắt đầu được cuộc họp',
          placement: 'top',
        });
      }
    },
    [navigate, withLoading],
  );

  // Already a member (the list only has my meetings): straight to the lobby.
  const onJoin = useCallback(
    (meeting: MeetingListItem) =>
      navigate('/meeting/lobby', { state: { meetingId: meeting.id } }),
    [navigate],
  );

  const onCopyLink = useCallback((meeting: MeetingListItem) => {
    clipboard.writeText(meeting.joinUrl ?? '');
    notification.success({
      message: 'Đã sao chép liên kết mời',
      placement: 'top',
    });
  }, []);

  const onDelete = useCallback((meeting: MeetingListItem) => {
    Modal.confirm({
      title: 'Xóa cuộc họp?',
      content: `"${meeting.title}" sẽ bị xóa khỏi danh sách của mọi người.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        try {
          await MeetingService.deleteMeeting(meeting.id);
          setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
        } catch (_) {
          notification.error({
            message: 'Không xóa được cuộc họp',
            description: 'Cuộc họp đang diễn ra phải được kết thúc trước.',
            placement: 'top',
          });
        }
      },
    });
  }, []);

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
        message: 'Không lưu được thay đổi',
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
          <span>Không tải được danh sách cuộc họp</span>
          <button type="button" onClick={() => load(1)}>
            Thử lại
          </button>
        </div>
      );
    }
    if (meetings.length === 0) {
      return (
        <div className="meetings-state">
          <span>Không có cuộc họp nào</span>
        </div>
      );
    }
    return (
      <>
        {groupByDay(meetings).map((group) => (
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
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
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
            <span>New meeting</span>
          </button>
          <button type="button" onClick={openJoinMeetingDialog}>
            <Icon name="meetingJoin" />
            <span>Join meeting</span>
          </button>
          <button type="button" onClick={openScheduleMeetingDialog}>
            <Icon name="meetingSchedule" />
            <span>Schedule</span>
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
