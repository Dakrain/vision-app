import { useAppSelector } from '@/renderer/store/hooks';
import { selectAuth } from '@/shared/store/auth/selector';
import {
  FileTextOutlined,
  GlobalOutlined,
  HddOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { LogoutDialog } from './LogoutDialog';
import { Language, currentLanguageLabel } from './panes/Language';
import { Packages } from './panes/Packages';
import { PersonalInfo } from './panes/PersonalInfo';
import { Storage } from './panes/Storage';
import { Terms } from './panes/Terms';
import './Setting.scss';

const { ipcRenderer } = window.require('electron');

export type SettingSection = 'profile' | 'storage' | 'terms' | 'language';

interface Props {
  section: SettingSection;
  onSectionChange: (section: SettingSection) => void;
  onLogout: () => void;
}

function MenuRow({
  icon,
  color,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`settings-menu-row ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="settings-menu-icon" style={{ background: color }}>
        {icon}
      </span>
      <span className="settings-menu-text">
        <b>{title}</b>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </button>
  );
}

/** Account settings (Figma "Account setting / …", 10946:59797 and siblings). */
function Setting({ section, onSectionChange, onLogout }: Props): JSX.Element {
  const { user } = useAppSelector(selectAuth);
  const [upgrading, setUpgrading] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    ipcRenderer
      .invoke('app:version')
      .then((v: string) => setVersion(v))
      .catch(() => {});
  }, []);

  useEffect(() => setUpgrading(false), [section]);

  const drive = user?.drive;
  const usedPercent =
    drive && drive.storageLimit
      ? Math.round((drive.storageUsed / drive.storageLimit) * 100)
      : 0;

  const renderPane = () => {
    if (!user) return null;
    switch (section) {
      case 'storage':
        return upgrading ? (
          <Packages
            currentPackageId={drive?.packageId}
            onBack={() => setUpgrading(false)}
          />
        ) : (
          <Storage onUpgrade={() => setUpgrading(true)} />
        );
      case 'terms':
        return <Terms />;
      case 'language':
        return <Language />;
      default:
        return <PersonalInfo user={user} />;
    }
  };

  return (
    <div className="settings-page">
      <nav className="settings-menu">
        <h3>TÀI KHOẢN</h3>
        <div>
          <MenuRow
            icon={<UserOutlined />}
            color="#0064ff"
            title="Thông tin cá nhân"
            active={section === 'profile'}
            onClick={() => onSectionChange('profile')}
          />
          <MenuRow
            icon={<HddOutlined />}
            color="#ff5a5a"
            title="Bộ nhớ"
            subtitle={`Đã sử dụng ${usedPercent}%`}
            active={section === 'storage'}
            onClick={() => onSectionChange('storage')}
          />
          <MenuRow
            icon={<FileTextOutlined />}
            color="#1ec88c"
            title="Điều khoản và Điều kiện"
            active={section === 'terms'}
            onClick={() => onSectionChange('terms')}
          />
          <MenuRow
            icon={<GlobalOutlined />}
            color="#7850dc"
            title="Ngôn ngữ"
            subtitle={currentLanguageLabel}
            active={section === 'language'}
            onClick={() => onSectionChange('language')}
          />
        </div>
        <hr />
        <MenuRow
          icon={<LogoutOutlined />}
          color="#ff3c3c"
          title="Đăng xuất"
          onClick={() => setLogoutOpen(true)}
        />
        {version && <p className="settings-version">Phiên bản {version}</p>}
      </nav>
      <main className="settings-content">{renderPane()}</main>
      <LogoutDialog
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          onLogout();
        }}
      />
    </div>
  );
}

export default Setting;
