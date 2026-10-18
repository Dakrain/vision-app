import { memo } from 'react';
import Icon from '@/assets/svg/icons';
import { MenuItemProps } from './type';
import './MenuItem.scss';

export const MenuItem = memo(function MenuItem({
  icon,
  name,
  onClick,
  locked = false,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`menu-item${locked ? ' locked' : ''}`}
      aria-disabled={locked}
    >
      {typeof icon === 'string' ? <Icon name={icon} /> : icon}
      <span>{name}</span>
    </button>
  );
});
