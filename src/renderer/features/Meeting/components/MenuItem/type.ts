import React from 'react';

export interface MenuItemProps {
  icon: string | React.ReactNode;
  name: string;
  onClick: () => void;
}
