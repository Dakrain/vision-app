import UserService, {
  type DriveStatistics,
} from '@/shared/services/User/UserService';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';

/** Bytes → "1,01 GB" (Vietnamese decimal comma, like the design). */
export const formatGb = (bytes: number) =>
  `${(bytes / 1024 ** 3).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  })} GB`;

// System folders (named in English on the server) and their colours.
const CATEGORIES: { match: RegExp; label: string; color: string }[] = [
  { match: /music/i, label: 'Âm nhạc', color: '#ff5a5a' },
  { match: /video/i, label: 'Video', color: '#0064ff' },
  { match: /doc/i, label: 'Tài liệu', color: '#ffc800' },
  {
    match: /nurtur|devot|dưỡng|spirit/i,
    label: 'Dưỡng linh',
    color: '#1ec88c',
  },
  { match: /tv/i, label: 'Vision TV', color: '#7850dc' },
];
const OTHER = { label: 'Khác', color: '#cccccc' };

interface Props {
  onUpgrade: () => void;
}

/** "Bộ nhớ" (Figma 10946:59878). */
export function Storage({ onUpgrade }: Props) {
  const [stats, setStats] = useState<DriveStatistics>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    UserService.fetchDriveStatistics()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="settings-empty">Không tải được thông tin bộ nhớ</div>
    );
  }
  if (!stats) {
    return (
      <div className="settings-empty">
        <Spin />
      </div>
    );
  }

  const { storageLimit, storageUsed } = stats.storage;
  // The server names plans in lower case ("standard").
  const packageName =
    stats.storage.packageName.charAt(0).toUpperCase() +
    stats.storage.packageName.slice(1);
  const percent = storageLimit
    ? Math.round((storageUsed / storageLimit) * 100)
    : 0;
  // Group folders into the design's categories; user folders count as "Khác".
  const groups = [
    ...CATEGORIES.map((c) => ({ ...c, used: 0 })),
    { ...OTHER, used: 0 },
  ];
  stats.folders.forEach((f) => {
    const g = groups.find((c) => 'match' in c && (c as any).match.test(f.name));
    (g ?? groups[groups.length - 1]).used += Math.max(0, f.storageUsed);
  });

  return (
    <div className="settings-storage">
      <section>
        <h2>Bộ nhớ hiện tại</h2>
        <p className="settings-muted">Mức sử dụng hiện tại của bạn:</p>
        <p className="settings-storage-total">
          {formatGb(storageUsed)} / {formatGb(storageLimit)} ({percent}%)
        </p>
        <div className="settings-storage-bar">
          {groups.map(
            (g) =>
              g.used > 0 && (
                <span
                  key={g.label}
                  style={{
                    width: `${(g.used / storageLimit) * 100}%`,
                    background: g.color,
                  }}
                />
              ),
          )}
        </div>
        <div className="settings-storage-legend">
          {groups.map((g) => (
            <span key={g.label}>
              <i style={{ background: g.color }} />
              {g.label} <b>{formatGb(g.used)}</b>
            </span>
          ))}
        </div>
      </section>
      <section>
        <h2>Gói hiện tại</h2>
        <p className="settings-muted">
          Hiện tại bạn đang sử dụng gói <b>{packageName}</b> với Dung lượng lưu
          trữ tối đa <b>{formatGb(storageLimit)}</b>
        </p>
        <div className="settings-plan-card">
          <span>{packageName}</span>
          <b>{formatGb(storageLimit)}</b>
        </div>
      </section>
      <section>
        <h2>Nâng cấp bộ nhớ</h2>
        <p className="settings-muted">
          Nâng cấp tài khoản để có thêm dung lượng lưu trữ
        </p>
        <button
          type="button"
          className="settings-btn green block"
          onClick={onUpgrade}
        >
          Nâng cấp dung lượng
        </button>
      </section>
    </div>
  );
}
