import Icon from '@/assets/svg/icons';
import { useTranslation } from 'react-i18next';
import './PanelHeader.scss';

type PanelHeaderProps = {
  title: string;
  onClose: () => void;
};

/**
 * A meeting side panel's title, with a close button at the top right:
 * pressing the toolbar button again also closes it, but many people
 * didn't know that.
 */
export function PanelHeader({ title, onClose }: PanelHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="meeting-panel-header">
      <h3 className="meeting-panel-header-title">{title}</h3>
      <button
        type="button"
        className="meeting-panel-header-close"
        aria-label={t('common.close')}
        title={t('common.close')}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
