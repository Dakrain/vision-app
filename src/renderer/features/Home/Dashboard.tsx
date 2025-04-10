import { logout } from '@/renderer/shared/store/auth/slice';
import {
  Avatar,
  CreateMeetingDialog,
  JoinMeetingDialog,
  MenuItem,
} from '@/shared/components/';
import { LogoutOutlined } from '@ant-design/icons';
import { Divider, Layout, Popover, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectAuth } from '../../shared/store/auth/selector';
import { PAGE_TRANSITION, PAGE_VARIANTS } from './constants';
import './Dashboard.scss';
import Chat from './pages/Chat/Chat';
import Home from './pages/Home/Home';
import Library from './pages/Library/Library';
import Meeting from './pages/Meeting/Meeting';
import Setting from './pages/Setting/Setting';

const { Sider } = Layout;
const { ipcRenderer } = window.require('electron');

function Dashboard() {
  useEffect(() => {
    ipcRenderer.send('resize-window', { width: 1366, height: 768 });
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const userDetail = useSelector(selectAuth);
  const [openJoinMeetingDialog, setOpenJoinMeetingDialog] = useState(false);
  const [openCreateMeetingDialog, setOpenCreateMeetingDialog] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const renderPage = (page: string) => {
    const content = (() => {
      switch (page.toLowerCase()) {
        case 'home':
          return (
            <Home
              openJoinMeetingDialog={() => setOpenJoinMeetingDialog(true)}
              openCreateMeetingDialog={() => {
                setOpenCreateMeetingDialog(true);
              }}
            />
          );
        case 'meeting':
          return <Meeting />;
        case 'chat':
          return <Chat />;
        case 'library':
          return <Library />;
        case 'setting':
          return <Setting />;
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
            
            <Popover
              content={
                <div>
                  <Typography>Phiên bản 1.0.0</Typography>
                  <div 
                    style={{ 
                      cursor: 'pointer', 
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#ff4d4f'
                    }}
                    onClick={() => {
                      dispatch(logout());
                      navigate('/login');
                    }}
                  >
                    <LogoutOutlined />
                    <Typography style={{ color: '#ff4d4f' }}>Đăng xuất</Typography>
                  </div>
                </div>
              }
              trigger="hover"
              open={settingOpen}
              onOpenChange={(open) => {
                setSettingOpen(open);
              }}
              placement='rightBottom'
            >
              <div >
                <Avatar
                  url={userDetail.user?.avatarUrl || ''}
                  radius={24}
                  name={userDetail.user?.fullName || ''}
                />
              </div>
            </Popover>
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
          <MenuItem
            label="Chat"
            icon="homeChat"
            activeIcon="homeChatActive"
            isActive={activeMenu.toLowerCase() === 'chat'}
            onClick={(label: string) => setActiveMenu(label)}
          />
          <MenuItem
            label="Library"
            icon="homeLibrary"
            activeIcon="homeLibraryActive"
            isActive={activeMenu.toLowerCase() === 'library'}
            onClick={(label: string) => setActiveMenu(label)}
          />
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
      <JoinMeetingDialog
        open={openJoinMeetingDialog}
        onClose={() => {
          setOpenJoinMeetingDialog(false);
        }}
      />
      <CreateMeetingDialog
        open={openCreateMeetingDialog}
        onClose={() => {
          setOpenCreateMeetingDialog(false);
        }}
      />
    </Layout>
  );
}

export default Dashboard;
