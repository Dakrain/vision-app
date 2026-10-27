import Icon from '@/assets/svg/icons';
import { Button, Popover, Tooltip } from 'antd';
import React from 'react';
import './EmojiPicker.scss';
import { Emoji, EmojiPickerProps } from './types';

const emojis: Emoji[] = [
  {  label: 'hand', value: 'HAND' },
  {  label: 'like', value: 'LIKE' },
  {  label: 'heart', value: 'HEART' },
  {  label: 'clap', value: 'CLAP'}
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, children, open, onClose, handRaised = false }) => {
  const content = (
    <div className="emoji-container">
      {emojis.map((emoji) => {
        const isHand = emoji.value === 'HAND';
        const button = (
          <Button
            onClick={() => {

              return onEmojiSelect(emoji.value);
            }}
            className={`emoji-button${isHand && handRaised ? ' active' : ''}`}
          >
            <Icon name={emoji.label} />
          </Button>
        );
        return isHand ? (
          <Tooltip key={emoji.label} title={handRaised ? 'Hạ tay' : 'Giơ tay'}>
            {button}
          </Tooltip>
        ) : (
          <React.Fragment key={emoji.label}>{button}</React.Fragment>
        );
      })}
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
