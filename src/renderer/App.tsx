import { SocialProvider } from './shared/social/SocialProvider';
import { CallProvider } from './shared/social/CallProvider';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './global.css';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
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
import { antdLocale, appTheme, configureStaticDialogs } from './theme';

configureStaticDialogs();

export default function App() {
  const { i18n } = useTranslation();
  return (
    <ConfigProvider locale={antdLocale(i18n.language)} theme={appTheme}>
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
