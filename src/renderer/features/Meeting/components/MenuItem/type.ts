import React from 'react';

export interface MenuItemProps {
  icon: string | React.ReactNode;
  name: string;
  onClick: () => void;
  /** Not allowed right now: shown dimmed (the click still explains why). */
  locked?: boolean;
}
