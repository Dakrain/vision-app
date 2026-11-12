import { ConfigProvider, ThemeConfig } from 'antd';
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
 * Modal.confirm / message / notification: the app's theme, with buttons
 * like the app's own (red, or red outline; 12 px corners, bold) and the
 * app's orange for a warning — not antd's blue buttons and black icon.
 */
export const dialogTheme: ThemeConfig = {
  ...appTheme,
  token: { ...appTheme.token, colorLink: brandRed, colorWarning: '#FF7800' },
  components: {
    ...appTheme.components,
    Button: {
      borderRadius: 12,
      controlHeight: 40,
      fontWeight: 600,
      paddingInline: 20,
      primaryShadow: 'none',
      defaultShadow: 'none',
      defaultColor: brandRed,
      defaultBorderColor: brandRed,
      defaultHoverColor: brandRed,
      defaultHoverBorderColor: brandRed,
      defaultHoverBg: 'rgba(255, 77, 79, 0.08)',
      defaultActiveColor: brandRed,
      defaultActiveBorderColor: brandRed,
    },
    Modal: {
      ...appTheme.components?.Modal,
      borderRadiusLG: 16,
      titleFontSize: 18,
    },
  },
};

/**
 * The static antd methods render outside the app's ConfigProvider, so
 * they came out in antd's default blue and font: give them the theme.
 */
export const configureStaticDialogs = () => {
  ConfigProvider.config({
    holderRender: (children) => (
      <ConfigProvider theme={dialogTheme} locale={antdLocale(i18n.language)}>
        {children}
      </ConfigProvider>
    ),
  });
};
