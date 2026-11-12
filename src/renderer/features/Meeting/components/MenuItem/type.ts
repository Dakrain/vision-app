import React from 'react';

export interface MenuItemProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onClick' | 'type'
  > {
  icon: string | React.ReactNode;
  name: string;
  /** Omit when a wrapper (e.g. a Dropdown trigger) handles the click. */
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Not allowed right now: shown dimmed (the click still explains why). */
  locked?: boolean;
  /** A small caret next to the icon: this opens a menu. */
  caret?: 'up' | 'down';
  /** Unread count on the icon (hidden at 0). */
  badge?: number;
  /**
   * Where the label is hidden (the meeting's icon-only bottom bar): it
   * shows above the button as soon as the pointer is on it.
   */
  tooltip?: boolean;
}
