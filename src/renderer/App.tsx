import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './global.css';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from '@/renderer/store/configureStore';
import Login from './features/Auth/pages/Login/Login';
import { LoadingOverlay } from './shared/components';
import Dashboard from './features/Home/Dashboard';
import Meeting from './features/Meeting/Meeting';
import SplashScreen from './features/Auth/pages/SplashScreen/SplashScreen';

export default function App() {
  return (
    <ConfigProvider
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
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Dashboard />} />
            <Route path="/meeting" element={<Meeting />} />
          </Routes>
        </Router>
      </Provider>
    </ConfigProvider>
  );
}
