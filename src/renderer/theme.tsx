import { ConfigProvider, notification, ThemeConfig } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import i18n from '@/renderer/i18n';

// antd's own texts (date pickers, empty lists…) in the app language.
const ANTD_LOCALE = { vi: viVN, en: enUS, zh: zhCN } as const;

export const antdLocale = (language: string) =>
  ANTD_LOCALE[language as keyof typeof ANTD_LOCALE] ?? viVN;

export const appTheme: ThemeConfig = {
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
};

const brandRed = '#FF4D4F';

/**
 * Modal.confirm / message / notification: the app's theme, with the app's
 * colours for their icons (green success, blue info, orange warning) —
 * not antd's. Their buttons look like the app's own through global.css.
 */
export const dialogTheme: ThemeConfig = {
  ...appTheme,
  token: {
    ...appTheme.token,
    colorLink: brandRed,
    colorSuccess: '#1EC88C',
    colorInfo: '#0064FF',
    colorWarning: '#FF7800',
  },
};

/**
 * The static antd methods render outside the app's ConfigProvider, so
 * they came out in antd's default blue and font: give them the theme.
 */
export const configureStaticDialogs = () => {
  // One place for every notice: top centre, unless a call site picks
  // another spot on purpose (a new-message banner, an incoming call).
  notification.config({ placement: 'top' });
  ConfigProvider.config({
    holderRender: (children) => (
      <ConfigProvider theme={dialogTheme} locale={antdLocale(i18n.language)}>
        {children}
      </ConfigProvider>
    ),
  });
};
