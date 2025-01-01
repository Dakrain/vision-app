import Icon from '../../../../../assets/svg/icons';
import './MenuItem.scss';
import { MenuItemProps } from './types';

export function MenuItem({
  label,
  icon,
  activeIcon,
  isActive,
  onClick,
  style,
}: MenuItemProps) {
  return (
    <div
      onClick={() => onClick(label)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(label)}
      role="button"
      tabIndex={0}
      className={`home-menu ${isActive ? 'active' : ''}`}
      style={style}
    >
      <Icon name={isActive ? activeIcon : icon} />
      <span className={`home-menu__label ${isActive ? 'active' : ''}`}>
        {label}
      </span>
    </div>
  );
}
