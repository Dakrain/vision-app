import Icon from '@/assets/svg/icons';
import { Button, Popover } from 'antd';
import React from 'react';
import './EmojiPicker.scss';
import { Emoji, EmojiPickerProps } from './types';

const emojis: Emoji[] = [
  {  label: 'hand', value: 'HAND' },
  {  label: 'like', value: 'LIKE' },
  {  label: 'heart', value: 'HEART' },
  {  label: 'clap', value: 'CLAP'}
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, children, open, onClose }) => {
  const content = (
    <div className="emoji-container">
      {emojis.map((emoji) => (
        <Button
          key={emoji.label}
          onClick={() => {
            
            return onEmojiSelect(emoji.value);
          }}
          className="emoji-button"
        >
          <Icon name={emoji.label} />
        </Button>
      ))}
    </div>
  );

  return (
    <Popover 
      content={content}
      onOpenChange={(open) => {
        if(!open) {
          onClose();
        }
      }}
      open={open}
      trigger="click"
      placement="top"
      overlayClassName="emoji-picker-popover"
    >
      {children}
    </Popover>
  );
};
