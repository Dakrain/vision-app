import React from 'react';

export interface MenuItemProps {
  label: string;
  icon: string;
  activeIcon: string;
  isActive: boolean;
  onClick: (label: string) => void;
  style?: React.CSSProperties;
}
