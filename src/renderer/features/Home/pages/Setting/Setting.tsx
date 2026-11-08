import { useAppSelector } from '@/renderer/store/hooks';
import { selectAuth } from '@/shared/store/auth/selector';
import Icon from '@/assets/svg/icons';
import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { LogoutDialog } from './LogoutDialog';
import { Language, useCurrentLanguageLabel } from './panes/Language';
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
  /** The account was deleted: forget the session here. */
  onAccountDeleted: () => void;
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
function Setting({
  section,
  onSectionChange,
  onLogout,
  onAccountDeleted,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const languageLabel = useCurrentLanguageLabel();
  const { user } = useAppSelector(selectAuth);
  const [upgrading, setUpgrading] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
        return (
          <PersonalInfo
            user={user}
            onDeleteAccount={() => setDeleteOpen(true)}
          />
        );
    }
  };

  return (
    <div className="settings-page">
      <nav className="settings-menu">
        <h3>{t('account.menu.section_title')}</h3>
        <div>
          <MenuRow
            icon={<Icon name="settingProfile" />}
            color="#0064ff"
            title={t('account.personal.title')}
            active={section === 'profile'}
            onClick={() => onSectionChange('profile')}
          />
          <MenuRow
            icon={<Icon name="settingSdcard" />}
            color="#ff5a5a"
            title={t('account.menu.storage')}
            subtitle={t('account.menu.storage_used', { percent: usedPercent })}
            active={section === 'storage'}
            onClick={() => onSectionChange('storage')}
          />
          <MenuRow
            icon={<Icon name="settingNote" />}
            color="#1ec88c"
            title={t('account.tab.terms')}
            active={section === 'terms'}
            onClick={() => onSectionChange('terms')}
          />
          <MenuRow
            icon={<Icon name="settingGlobe" />}
            color="#7850dc"
            title={t('language.title')}
            subtitle={languageLabel}
            active={section === 'language'}
            onClick={() => onSectionChange('language')}
          />
        </div>
        <hr />
        <MenuRow
          icon={<Icon name="settingSignout" />}
          color="#ff3c3c"
          title={t('account.tab.logout')}
          onClick={() => setLogoutOpen(true)}
        />
        {version && (
          <p className="settings-version">
            {t('home.menu.version', { version })}
          </p>
        )}
      </nav>
      <main className="settings-content">{renderPane()}</main>
      <DeleteAccountDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          onAccountDeleted();
        }}
      />
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
