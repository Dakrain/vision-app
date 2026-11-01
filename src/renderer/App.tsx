import { SocialProvider } from './shared/social/SocialProvider';
import { CallProvider } from './shared/social/CallProvider';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './global.css';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useTranslation } from 'react-i18next';
import { store } from '@/renderer/store/configureStore';
import { CallOverlay } from './shared/social/CallOverlay';
import Login from './features/Auth/pages/Login/Login';
import Register from './features/Auth/pages/Register/Register';
import { LoadingOverlay } from './shared/components';
import { DeepLinkHandler } from './shared/components/DeepLinkHandler';
import Dashboard from './features/Home/Dashboard';
import Meeting from './features/Meeting/Meeting';
import MeetingLobby from './features/MeetingLobby/MeetingLobby';
import SplashScreen from './features/Auth/pages/SplashScreen/SplashScreen';

// antd's own texts (date pickers, empty lists…) in the app language.
const ANTD_LOCALE = { vi: viVN, en: enUS, zh: zhCN } as const;

export default function App() {
  const { i18n } = useTranslation();
  return (
    <ConfigProvider
      locale={ANTD_LOCALE[i18n.language as keyof typeof ANTD_LOCALE] ?? viVN}
      theme={{
        components: {
          Menu: {
            itemHeight: 72,
          },
          Segmented: {
            borderRadius: 6,
          },
          Modal: {
            footerBg: '#F7F7F7',
            colorPrimary: '#FF4D4F',
            colorPrimaryHover: '#ff7875',
            colorTextLightSolid: '#FFFFFF', // Màu text button
          },
          Switch: {
            colorPrimary: '#1EC88C',
            colorPrimaryHover: '#4AD3A4',
            trackHeight: 32,
            handleSize: 28,
            trackMinWidth: 52,
          },
          Input: {
            fontSize: 16,
            borderRadius: 8,
            paddingBlock: 8,
            paddingInline: 16,
            colorBgContainer: '#F7F7F7',
            colorBorder: 'transparent',
          },
          InputNumber: {
            fontSize: 16,
            borderRadius: 8,
            paddingBlock: 8,
            paddingInline: 16,
            colorBgContainer: '#F7F7F7',
            colorBorder: 'transparent',
          },
          DatePicker: {
            borderRadius: 8,
            fontSize: 16,
            paddingInline: 16,
            paddingBlockLG: 8,
            paddingInlineLG: 16,
            paddingInlineSM: 16,
            paddingBlock: 16,
            colorBgContainer: '#F7F7F7',
            colorBorder: 'transparent',
          },
        },
        token: {
          colorPrimary: '#FF4D4F',
          fontFamily: 'SF-Compact-Display',
          colorText: '#333333',
        },
      }}
    >
      <Provider store={store}>
        <LoadingOverlay />
        <Router>
          <SocialProvider>
            <CallProvider>
              <DeepLinkHandler />
              <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/home" element={<Dashboard />} />
                <Route path="/meeting" element={<Meeting />} />
                <Route path="/meeting/lobby" element={<MeetingLobby />} />
              </Routes>
              <CallOverlay />
            </CallProvider>
          </SocialProvider>
        </Router>
      </Provider>
    </ConfigProvider>
  );
}
