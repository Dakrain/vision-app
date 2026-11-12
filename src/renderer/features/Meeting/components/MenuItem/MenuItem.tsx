import { forwardRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/assets/svg/icons';
import { MenuItemProps } from './type';
import './MenuItem.scss';

// The ref and className reach the button: a Popover / Dropdown wrapping
// this needs the ref to tell a click on its trigger from one outside, and
// marks the open trigger with a class (the bottom bar's labels use it).
export const MenuItem = memo(
  forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
    {
      icon,
      name,
      onClick,
      locked = false,
      caret,
      badge = 0,
      tooltip = false,
      className,
      ...triggerProps
    },
    ref,
  ) {
    const { t } = useTranslation();
    return (
      <button
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...triggerProps}
        ref={ref}
        onClick={onClick}
        type="button"
        className={[
          'menu-item',
          locked && 'locked',
          tooltip && 'with-tooltip',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-disabled={locked}
        aria-label={name}
        // The browser's own tooltip, where there is no quicker one.
        title={tooltip ? undefined : name}
      >
        <span className="menu-item-icon-row">
          <span className="menu-item-icon">
            {typeof icon === 'string' ? <Icon name={icon} /> : icon}
            {badge > 0 && (
              <span
                className="menu-item-badge"
                aria-label={t('meeting.room.badge_new', { count: badge })}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          {caret && (
            <Icon
              name={caret === 'up' ? 'meetingCaretUp' : 'meetingCaretDown'}
            />
          )}
        </span>
        <span className="menu-item-label">{name}</span>
      </button>
    );
  }),
);
