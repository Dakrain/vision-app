import { memo } from 'react';
import Icon from '@/assets/svg/icons';
import { MenuItemProps } from './type';
import './MenuItem.scss';

export const MenuItem = memo(function MenuItem({
  icon,
  name,
  onClick,
  locked = false,
  caret,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`menu-item${locked ? ' locked' : ''}`}
      aria-disabled={locked}
      title={name}
    >
      <span className="menu-item-icon-row">
        <span className="menu-item-icon">
          {typeof icon === 'string' ? <Icon name={icon} /> : icon}
        </span>
        {caret && (
          <Icon name={caret === 'up' ? 'meetingCaretUp' : 'meetingCaretDown'} />
        )}
      </span>
      <span className="menu-item-label">{name}</span>
    </button>
  );
});
