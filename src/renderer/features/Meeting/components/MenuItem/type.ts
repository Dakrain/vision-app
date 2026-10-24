import React from 'react';

export interface MenuItemProps {
  icon: string | React.ReactNode;
  name: string;
  /** Omit when a wrapper (e.g. a Dropdown trigger) handles the click. */
  onClick?: () => void;
  /** Not allowed right now: shown dimmed (the click still explains why). */
  locked?: boolean;
  /** A small caret next to the icon: this opens a menu. */
  caret?: 'up' | 'down';
}
