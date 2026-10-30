import { logout } from '@/renderer/shared/store/auth/slice';
import {
  Avatar,
  CreateMeetingDialog,
  JoinMeetingDialog,
  MenuItem,
} from '@/shared/components/';
import { Badge, Divider, Dropdown, Layout } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectAuth } from '../../shared/store/auth/selector';
import { useSocial } from '../../shared/social/SocialProvider';
import { PAGE_TRANSITION, PAGE_VARIANTS } from './constants';
import './Dashboard.scss';
import Chat from './pages/Chat/Chat';
import Home from './pages/Home/Home';
import Meeting from './pages/Meeting/Meeting';
import { LogoutDialog } from './pages/Setting/LogoutDialog';
import Setting, { type SettingSection } from './pages/Setting/Setting';
import UserService from '../../shared/services/User/UserService';

const { Sider } = Layout;
const { ipcRenderer } = window.require('electron');

// The tab last open, kept across remounts (leaving a meeting rebuilds the
// dashboard; it used to land on Home every time).
let lastMenu = 'home';

function Dashboard() {
  useEffect(() => {
    // Only out of the small login window: coming back from a meeting it
    // snapped a resized or moved window back to 1366x768, centred.
    if (window.innerWidth < 900) {
      ipcRenderer.send('resize-window', { width: 1366, height: 768 });
    }
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenuState] = useState<string>(lastMenu);
  const setActiveMenu = (menu: string) => {
    lastMenu = menu;
    setActiveMenuState(menu);
  };
  const userDetail = useSelector(selectAuth);
  const [openJoinMeetingDialog, setOpenJoinMeetingDialog] = useState(false);
  const [openCreateMeetingDialog, setOpenCreateMeetingDialog] = useState(false);
  const [scheduleMeeting, setScheduleMeeting] = useState(false);
  // Bumped when a meeting gets scheduled, so the meeting list reloads.
  const [meetingsVersion, setMeetingsVersion] = useState(0);
  const [settingSection, setSettingSection] =
    useState<SettingSection>('profile');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    ipcRenderer
      .invoke('app:version')
      .then((v: string) => setVersion(v))
      .catch(() => {});
  }, []);

  const doLogout = async () => {
    lastMenu = 'home';
    // Drop this device server-side too; leave either way.
    await UserService.logout().catch(() => {});
    dispatch(logout());
    navigate('/login');
  };

  const openSettings = (section: SettingSection) => {
    setSettingSection(section);
    setActiveMenu('setting');
  };
  const { unreadTotal } = useSocial();
  const renderPage = (page: string) => {
    const content = (() => {
      switch (page.toLowerCase()) {
        case 'home':
          return (
            <Home
              openJoinMeetingDialog={() => setOpenJoinMeetingDialog(true)}
              openCreateMeetingDialog={() => {
                setScheduleMeeting(false);
                setOpenCreateMeetingDialog(true);
              }}
            />
          );
        case 'meeting':
          return (
            <Meeting
              openJoinMeetingDialog={() => setOpenJoinMeetingDialog(true)}
              openCreateMeetingDialog={() => {
                setScheduleMeeting(false);
                setOpenCreateMeetingDialog(true);
              }}
              openScheduleMeetingDialog={() => {
                setScheduleMeeting(true);
                setOpenCreateMeetingDialog(true);
              }}
              refreshKey={meetingsVersion}
            />
          );
        case 'chat':
          return <Chat />;
        case 'setting':
          return (
            <Setting
              section={settingSection}
              onSectionChange={setSettingSection}
              onLogout={doLogout}
            />
          );
        default:
          return null;
      }
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial="enter"
          animate="center"
          exit="exit"
          variants={PAGE_VARIANTS}
          transition={PAGE_TRANSITION}
          className="home-layout__page-container"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <Layout className="home-layout">
      <Sider width={80} className="home-layout__sider">
        <div className="home-layout__menu-container">
          <div className="home-layout__avatar">
            <Dropdown
              trigger={['click']}
              placement="bottomLeft"
              overlayClassName="home-account-menu"
              menu={{
                items: [
                  { key: 'account', label: 'Tài khoản' },
                  { key: 'settings', label: 'Cài đặt' },
                  { type: 'divider' },
                  { key: 'logout', label: 'Đăng xuất', danger: true },
                  ...(version
                    ? [
                        {
                          key: 'version',
                          label: `Phiên bản ${version}`,
                          disabled: true,
                        },
                      ]
                    : []),
                ],
                onClick: ({ key }) => {
                  if (key === 'account') openSettings('profile');
                  if (key === 'settings') openSettings('language');
                  if (key === 'logout') setLogoutOpen(true);
                },
              }}
            >
              <button type="button" className="home-layout__avatar-btn">
                <Avatar
                  url={userDetail.user?.avatarUrl || ''}
                  radius={24}
                  name={userDetail.user?.fullName || ''}
                />
              </button>
            </Dropdown>
          </div>
          <MenuItem
            label="Home"
            icon="home"
            activeIcon="homeActive"
            isActive={activeMenu.toLowerCase() === 'home'}
            onClick={(label: string) => setActiveMenu(label)}
          />
          <MenuItem
            label="Meeting"
            icon="homeMeeting"
            activeIcon="homeMeetingActive"
            isActive={activeMenu.toLowerCase() === 'meeting'}
            onClick={(label: string) => setActiveMenu(label)}
          />
          <Badge
            count={unreadTotal}
            size="small"
            offset={[-12, 12]}
            rootClassName="home-layout__menu-badge"
          >
            <MenuItem
              label="Chat"
              icon="homeChat"
              activeIcon="homeChatActive"
              isActive={activeMenu.toLowerCase() === 'chat'}
              onClick={(label: string) => setActiveMenu(label)}
            />
          </Badge>
        </div>

        <div className="home-layout__setting-container">
          <MenuItem
            label="Setting"
            icon="homeSetting"
            activeIcon="homeSettingActive"
            isActive={activeMenu.toLowerCase() === 'setting'}
            onClick={(label: string) => setActiveMenu(label)}
          />
        </div>
      </Sider>
      <Divider
        type="vertical"
        style={{ height: '100vh', width: '1px', padding: 0, margin: 0 }}
      />
      <Layout className="home-layout__content">{renderPage(activeMenu)}</Layout>
      <LogoutDialog
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          doLogout();
        }}
      />
      <JoinMeetingDialog
        open={openJoinMeetingDialog}
        onClose={() => {
          setOpenJoinMeetingDialog(false);
        }}
      />
      <CreateMeetingDialog
        open={openCreateMeetingDialog}
        schedule={scheduleMeeting}
        onClose={() => {
          setOpenCreateMeetingDialog(false);
        }}
        onScheduled={() => setMeetingsVersion((v) => v + 1)}
      />
    </Layout>
  );
}

export default Dashboard;
